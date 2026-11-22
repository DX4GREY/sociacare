const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let pgPool = null;
let sqliteDb = null;
let activeEngine = 'sql-sqlite'; // 'postgresql' | 'sql-sqlite'

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    class_name VARCHAR(60) DEFAULT '',
    avatar_style VARCHAR(40) DEFAULT 'student-female',
    device_token VARCHAR(255) DEFAULT '',
    is_emergency INTEGER DEFAULT 0,
    emergency_level VARCHAR(30) DEFAULT 'normal',
    emergency_reason TEXT DEFAULT '',
    emergency_warning_ai TEXT DEFAULT '',
    emergency_updated_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id VARCHAR(60) NOT NULL,
    topic_title VARCHAR(150) NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    stage INTEGER DEFAULT 3,
    is_emergency INTEGER DEFAULT 0,
    emergency_level VARCHAR(30) DEFAULT 'normal',
    emergency_reason TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    structured_json TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS counselor_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_title VARCHAR(150) NOT NULL,
    preferred_schedule VARCHAR(100) NOT NULL,
    urgency VARCHAR(30) DEFAULT 'normal',
    message TEXT NOT NULL,
    status VARCHAR(60) DEFAULT 'Menunggu Persetujuan Guru BK',
    counselor_reply TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_saved_tips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tip_id VARCHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER DEFAULT NULL,
    user_id INTEGER DEFAULT NULL,
    model_name VARCHAR(80) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    thought_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER DEFAULT NULL,
    severity VARCHAR(30) DEFAULT 'critical',
    trigger_message TEXT NOT NULL,
    ai_warning_message TEXT NOT NULL,
    ai_assessment TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_tips (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    points_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_articles (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    read_time VARCHAR(50) DEFAULT '3 menit',
    excerpt TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_videos (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    duration VARCHAR(50) DEFAULT '5:00',
    description TEXT NOT NULL,
    youtube_id VARCHAR(100) NOT NULL,
    embed_url TEXT NOT NULL,
    key_takeaways_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_learning_memory (
    id SERIAL PRIMARY KEY,
    topic_id VARCHAR(60) NOT NULL,
    category VARCHAR(80) DEFAULT 'general',
    query_pattern TEXT NOT NULL,
    learned_insight TEXT NOT NULL,
    key_takeaway TEXT DEFAULT '',
    source_session_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_reference_photos (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    tags TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nip VARCHAR(60) DEFAULT '',
    phone VARCHAR(30) DEFAULT '',
    role VARCHAR(30) DEFAULT 'guru_bk',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const MIGRATION_COLUMNS = [
  `ALTER TABLE users ADD COLUMN device_token VARCHAR(255) DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN is_emergency INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN emergency_level VARCHAR(30) DEFAULT 'normal'`,
  `ALTER TABLE users ADD COLUMN emergency_reason TEXT DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN emergency_warning_ai TEXT DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN emergency_updated_at TIMESTAMP DEFAULT NULL`,
  `ALTER TABLE chat_sessions ADD COLUMN is_emergency INTEGER DEFAULT 0`,
  `ALTER TABLE chat_sessions ADD COLUMN emergency_level VARCHAR(30) DEFAULT 'normal'`,
  `ALTER TABLE chat_sessions ADD COLUMN emergency_reason TEXT DEFAULT ''`,
];

async function initDatabase() {
  try {
    const { Pool } = require('pg');
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/sociacare';
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 1500,
    });
    const client = await pool.connect();
    await client.query(PG_SCHEMA);
    for (const alterSql of MIGRATION_COLUMNS) {
      try {
        await client.query(alterSql);
      } catch {
        // Column already exists
      }
    }
    client.release();
    pgPool = pool;
    activeEngine = 'postgresql';
    console.log('[DB] Connected to PostgreSQL database (sociacare).');
  } catch (err) {
    const dbPath = path.join(__dirname, 'sociacare.sql.db');
    sqliteDb = new DatabaseSync(dbPath);
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    sqliteDb.exec(schemaSql);
    for (const alterSql of MIGRATION_COLUMNS) {
      try {
        sqliteDb.exec(alterSql);
      } catch {
        // Column already exists
      }
    }
    activeEngine = 'sql-sqlite';
    console.log(`[DB] Using local SQL engine (sociacare.sql.db) — PostgreSQL fallback active.`);
  }

  await seedInitialContentIfEmpty();
}

async function seedInitialContentIfEmpty() {
  try {
    const { SOCIAL_TIPS, ARTICLES, EDUCATIONAL_VIDEOS } = require('./counselorData');

    // 1. Tips
    const tipsCountRes = await query(`SELECT COUNT(*) as count FROM content_tips`);
    const tipsCount = Number(tipsCountRes.rows[0]?.count || 0);
    if (tipsCount === 0) {
      for (const tip of SOCIAL_TIPS) {
        await query(
          `INSERT INTO content_tips (id, category, title, summary, points_json) VALUES ($1, $2, $3, $4, $5)`,
          [tip.id, tip.category, tip.title, tip.summary, JSON.stringify(tip.points || [])]
        );
      }
      console.log(`[DB Seed] Seeded ${SOCIAL_TIPS.length} initial tips.`);
    }

    // 2. Articles
    const artCountRes = await query(`SELECT COUNT(*) as count FROM content_articles`);
    const artCount = Number(artCountRes.rows[0]?.count || 0);
    if (artCount === 0) {
      for (const art of ARTICLES) {
        await query(
          `INSERT INTO content_articles (id, category, title, read_time, excerpt, content_json) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            art.id,
            art.category,
            art.title,
            art.readTime || '3 menit',
            art.excerpt,
            JSON.stringify(art.content || []),
          ]
        );
      }
      console.log(`[DB Seed] Seeded ${ARTICLES.length} initial articles.`);
    }

    // 3. Videos
    const vidCountRes = await query(`SELECT COUNT(*) as count FROM content_videos`);
    const vidCount = Number(vidCountRes.rows[0]?.count || 0);
    if (vidCount === 0) {
      for (const vid of EDUCATIONAL_VIDEOS) {
        await query(
          `INSERT INTO content_videos (id, category, title, duration, description, youtube_id, embed_url, key_takeaways_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            vid.id,
            vid.category,
            vid.title,
            vid.duration || '5:00',
            vid.description,
            vid.youtubeId,
            vid.embedUrl || `https://www.youtube-nocookie.com/embed/${vid.youtubeId}`,
            JSON.stringify(vid.keyTakeaways || []),
          ]
        );
      }
      console.log(`[DB Seed] Seeded ${EDUCATIONAL_VIDEOS.length} initial videos.`);
    }

    // 4. Initial AI Learning Memory (Pembelajaran Umum dari Database)
    const memCountRes = await query(`SELECT COUNT(*) as count FROM ai_learning_memory`);
    const memCount = Number(memCountRes.rows[0]?.count || 0);
    if (memCount === 0) {
      const initialMemories = [
        {
          topic_id: 'friendship',
          category: 'Hubungan Pertemanan',
          query_pattern: 'Merasa dijauhi teman sekelompok atau takut ditolak saat berbeda pendapat',
          learned_insight: 'Validasi rasa takut kesepian siswa. Bedakan teman yang tulus vs teman bersyarat. Ajarkan menolak ajakan yang merugikan dengan sopan tanpa menyalahkan.',
          key_takeaway: 'Teman sejati menghargai batasanmu. Kamu tidak perlu mengorbankan prinsip hanya untuk disukai.',
        },
        {
          topic_id: 'communication',
          category: 'Komunikasi Asertif',
          query_pattern: 'Memendam rasa kesal karena takut menyinggung teman saat ada masalah',
          learned_insight: 'Memendam masalah berlarut justru memperbesar kesalahpahaman. Latih formula I-Statement (Saya merasa... saat... karena saya berharap...).',
          key_takeaway: 'Asertif bukan agresif. Bicarakan masalah saat kepala sudah dingin dengan fokus pada fakta dan perasaanmu.',
        },
        {
          topic_id: 'confidence',
          category: 'Kepercayaan Diri',
          query_pattern: 'Gugup, gemetar, dan takut ditertawakan saat presentasi atau maju ke depan kelas',
          learned_insight: 'Kecemasan sering timbul dari ilusi spotlight effect (merasa dinilai berlebihan). Solusi praktis: Latihan pernapasan 4-7-8, pegang cue card/pulpen, dan fokus membagikan 1 manfaat materi.',
          key_takeaway: 'Gugup itu wajar dan merupakan energi positif jika diarahkan. Audiens fokus pada materi yang kamu sampaikan, bukan kekuranganmu.',
        },
        {
          topic_id: 'bullying',
          category: 'Pencegahan Bullying',
          query_pattern: 'Diejek fisik, dikucilkan di medsos, atau diancam agar tidak lapor',
          learned_insight: 'Korban sering merasa bersalah atas perlakuan pelaku. Berikan penguatan bahwa perundungan 100% kesalahan pelaku. Pandu mendokumentasikan bukti dan segera lapor ke Guru BK.',
          key_takeaway: 'Melapor bukan mengadu yang lemah, melainkan langkah berani menyelamatkan diri sendiri dan orang lain.',
        },
      ];

      for (const mem of initialMemories) {
        await query(
          `INSERT INTO ai_learning_memory (topic_id, category, query_pattern, learned_insight, key_takeaway) VALUES ($1, $2, $3, $4, $5)`,
          [mem.topic_id, mem.category, mem.query_pattern, mem.learned_insight, mem.key_takeaway]
        );
      }
      console.log(`[DB Seed] Seeded ${initialMemories.length} initial AI learning memories.`);
    }

    // 5. Initial AI Reference Photos (Katalog Foto Referensi Belajar AI)
    const photoCountRes = await query(`SELECT COUNT(*) as count FROM ai_reference_photos`);
    const photoCount = Number(photoCountRes.rows[0]?.count || 0);
    if (photoCount === 0) {
      const initialPhotos = [
        {
          id: 'assertive-communication',
          title: "Formula Komunikasi Asertif 'I-Statement'",
          category: 'Komunikasi Asertif',
          description: 'Panduan visual 3 langkah menyampaikan perasaan tanpa menyalahkan teman: Fakta - Perasaan - Kebutuhan Solutif.',
          file_url: '/infographics/assertive-communication.svg',
          file_name: 'assertive-communication.svg',
          tags: 'asertif, komunikasi, konflik, jujur, perasaan',
        },
        {
          id: 'presentation-confidence',
          title: '4 Pilar Kepercayaan Diri Saat Presentasi',
          category: 'Kepercayaan Diri',
          description: 'Infografis teknik mengatasi demam panggung: Persiapan Materi, Pernapasan Tenang, Kontak Mata Lembut, dan Bahasa Tubuh Terbuka.',
          file_url: '/infographics/presentation-confidence.svg',
          file_name: 'presentation-confidence.svg',
          tags: 'percaya diri, presentasi, grogi, panggung, percaya, berani',
        },
        {
          id: 'healthy-friendship',
          title: 'Ciri-Ciri Hubungan Pertemanan yang Sehat (Green Flags)',
          category: 'Hubungan Pertemanan',
          description: 'Infografis karakteristik pertemanan suportif: Saling Mendukung, Menghargai Batasan, Tidak Menghakimi, dan Komunikasi Terbuka.',
          file_url: '/infographics/healthy-friendship.svg',
          file_name: 'healthy-friendship.svg',
          tags: 'teman, sahabat, sirkel, sehat, pertemanan, toxic',
        },
        {
          id: 'stop-bullying',
          title: '4 Langkah Berani Melawan & Menghentikan Bullying',
          category: 'Pencegahan Bullying',
          description: 'Panduan tindakan saat menghadapi atau menyaksikan perundungan: Tetap Tenang, Katakan Tidak Tegas, Cari Bantuan Guru BK, dan Dukung Korban.',
          file_url: '/infographics/stop-bullying.svg',
          file_name: 'stop-bullying.svg',
          tags: 'bullying, perundungan, tolong, lapor, stop bullying, aman',
        },
      ];

      for (const p of initialPhotos) {
        await query(
          `INSERT INTO ai_reference_photos (id, title, category, description, file_url, file_name, file_size, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [p.id, p.title, p.category, p.description, p.file_url, p.file_name, 10240, p.tags]
        );
      }
      console.log(`[DB Seed] Seeded ${initialPhotos.length} initial AI reference photos.`);
    }
  } catch (err) {
    console.error('[DB Seed Error]', err.message);
  }
}

async function query(sqlText, params = []) {
  if (activeEngine === 'postgresql' && pgPool) {
    const res = await pgPool.query(sqlText, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
    };
  }

  const sqliteSql = sqlText.replace(/\$\d+/g, '?');
  const trimmed = sqliteSql.trim().toUpperCase();

  if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
    const stmt = sqliteDb.prepare(sqliteSql);
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length };
  } else if (trimmed.includes('RETURNING')) {
    const stmt = sqliteDb.prepare(sqliteSql);
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length };
  } else {
    const stmt = sqliteDb.prepare(sqliteSql);
    const info = stmt.run(...params);
    return {
      rows: [{ id: Number(info.lastInsertRowid) }],
      rowCount: info.changes,
    };
  }
}

function getEngineInfo() {
  return {
    engine: activeEngine,
    label:
      activeEngine === 'postgresql'
        ? 'PostgreSQL (sociacare)'
        : 'SQL Engine (sociacare.sql.db - Local SQL)',
  };
}

module.exports = {
  initDatabase,
  query,
  getEngineInfo,
};
