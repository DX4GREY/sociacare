const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { initDatabase, query, getEngineInfo } = require('./db');
const { TOPICS, SOCIAL_TIPS, ARTICLES, EDUCATIONAL_VIDEOS } = require('./counselorData');
const {
  generateCounselorResponse,
  DEFAULT_SYSTEM_PERSONA,
  callDeepSeekApi,
  recordConversationLearning,
  resolveFallbackTimeOrGeneral,
  getCurrentDateTimeContext,
} = require('./geminiService');

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Session secret for HMAC token signing
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.ADMIN_PASSWORD
    ? crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD + 'sociacare-salt').digest('hex')
    : crypto.randomBytes(32).toString('hex'));

const serverLogs = [];
function addServerLog(level, message) {
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  serverLogs.unshift(entry);
  if (serverLogs.length > 150) serverLogs.pop();
}

addServerLog('INFO', 'SociaCare AI server initialized.');

// Express hardening middlewares (M1, C4)
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Static uploads with security headers (M4)
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    next();
  },
  express.static(uploadsDir)
);

// Global & Auth Rate Limiting (M1)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.' },
});
app.use('/api/admin/login', authLimiter);
app.use('/api/teacher/login', authLimiter);

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak pesan terkirim. Mohon tunggu sebentar.' },
});
app.use('/api/sessions/:sessionId/messages', messageLimiter);

app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !req.path.includes('/server-stats')) {
    addServerLog('HTTP', `${req.method} ${req.path}`);
  }
  next();
});

function parseStructured(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Cryptographic short-lived signed tokens (C1, C2)
function createToken(payload, expiresInSeconds = 86400) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp, jti: crypto.randomBytes(16).toString('hex') })
  ).toString('base64url');
  const tokenData = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(tokenData).digest('base64url');
  return `${tokenData}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const tokenData = `${header}.${body}`;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(tokenData).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const token =
    req.cookies?.sociacare_admin_token ||
    req.cookies?.sociacare_teacher_token ||
    req.headers['x-admin-token'] ||
    req.headers['x-teacher-token'] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : null);
  return verifyToken(token);
}

function requireAdmin(req, res, next) {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res
      .status(401)
      .json({ error: 'Tidak memiliki akses Admin. Silakan login kembali.' });
  }
  req.user = user;
  next();
}

function requireTeacherOrAdmin(req, res, next) {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'guru_bk')) {
    return res
      .status(401)
      .json({ error: 'Tidak memiliki akses Guru BK atau Admin. Silakan login kembali.' });
  }
  req.user = user;
  next();
}

// User device token ownership check (C3)
async function verifyUserOwnership(userId, deviceToken) {
  if (!userId || !deviceToken) return null;
  const res = await query(
    `SELECT * FROM users WHERE id = $1 AND device_token = $2 LIMIT 1`,
    [userId, deviceToken]
  );
  return res.rows[0] || null;
}

const DEFAULT_AI_SETTINGS = {
  openingMode: 'global', // 'global' | 'per_topic'
  globalGreeting:
    'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
  topicGreetings: {
    friendship:
      'Halo {nama}! Terima kasih sudah memilih topik Hubungan Pertemanan. Boleh ceritakan lebih detail, apa yang sedang kamu alami bersama temanmu?',
    communication:
      'Halo {nama}! Terima kasih sudah memilih topik Komunikasi Efektif. Boleh ceritakan situasi komunikasi seperti apa yang sedang membuatmu bingung?',
    confidence:
      'Halo {nama}! Terima kasih sudah memilih topik Kepercayaan Diri. Boleh ceritakan hal apa yang akhir-akhir ini membuatmu merasa kurang percaya diri?',
    bullying:
      'Halo {nama}, ruang ini aman untukmu. Terima kasih sudah berani memilih topik Mencegah Bullying. Boleh ceritakan apa yang sedang kamu lihat atau alami?',
  },
  openingFooter: '',
  openingQuickReplies: [],
  systemPersona: DEFAULT_SYSTEM_PERSONA,
};

async function getAiSettings() {
  try {
    const res = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'ai_config' LIMIT 1`
    );
    if (res.rows.length > 0) {
      const parsed = JSON.parse(res.rows[0].setting_value);
      const cleanedPersona =
        typeof parsed.systemPersona === 'string'
          ? parsed.systemPersona.replace(/\s*dari kelas "\{kelas\}"/gi, '')
          : DEFAULT_SYSTEM_PERSONA;
      return {
        ...DEFAULT_AI_SETTINGS,
        ...parsed,
        systemPersona: cleanedPersona || DEFAULT_SYSTEM_PERSONA,
        topicGreetings: {
          ...DEFAULT_AI_SETTINGS.topicGreetings,
          ...(parsed.topicGreetings || {}),
        },
      };
    }
  } catch {
    // Fallback to default
  }
  return { ...DEFAULT_AI_SETTINGS };
}

async function saveAiSettings(newSettings) {
  const merged = {
    ...DEFAULT_AI_SETTINGS,
    ...newSettings,
    topicGreetings: {
      ...DEFAULT_AI_SETTINGS.topicGreetings,
      ...(newSettings.topicGreetings || {}),
    },
  };
  const jsonStr = JSON.stringify(merged);
  const existing = await query(
    `SELECT setting_key FROM app_settings WHERE setting_key = 'ai_config' LIMIT 1`
  );
  if (existing.rows.length > 0) {
    await query(
      `UPDATE app_settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = 'ai_config'`,
      [jsonStr]
    );
  } else {
    await query(
      `INSERT INTO app_settings (setting_key, setting_value) VALUES ('ai_config', $1)`,
      [jsonStr]
    );
  }
  return merged;
}

function formatOpeningMessage(template, { userName, userClass, topicTitle }) {
  return String(template || DEFAULT_AI_SETTINGS.globalGreeting)
    .replace(/\{nama\}/gi, userName || 'Teman')
    .replace(/\{kelas\}/gi, userClass || '')
    .replace(/\{topik\}/gi, topicTitle || '');
}

async function recordTokenUsage({ sessionId, userId, usage }) {
  if (!usage) return;
  try {
    await query(
      `INSERT INTO ai_usage_logs (session_id, user_id, model_name, prompt_tokens, completion_tokens, thought_tokens, total_tokens, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sessionId || null,
        userId || null,
        usage.modelName || 'gemini-3.5-flash-lite',
        Number(usage.promptTokens || 0),
        Number(usage.completionTokens || 0),
        Number(usage.thoughtTokens || 0),
        Number(usage.totalTokens || 0),
        Number(usage.latencyMs || 0),
      ]
    );
  } catch (err) {
    console.error('[Token Log Error]', err.message);
  }
}

// ============================================================================
// STUDENT & PUBLIC API ROUTES
// ============================================================================

app.get('/api/topics', (req, res) => {
  res.json({
    topics: TOPICS.map(({ id, title, shortTitle, description }) => ({
      id,
      title,
      shortTitle,
      description,
    })),
  });
});

app.post('/api/users/identify', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const avatarStyle =
      req.body?.avatarStyle === 'student-male' ? 'student-male' : 'student-female';
    const deviceToken = String(
      req.body?.deviceToken || req.headers['x-device-token'] || ''
    ).trim().slice(0, 255);

    if (!name) {
      return res.status(400).json({ error: 'Nama wajib diisi.' });
    }

    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token tidak valid.' });
    }

    // Isolated per-device user: Cari user yang terikat HANYA dengan device_token ini
    const existing = await query(
      `SELECT * FROM users WHERE device_token = $1 ORDER BY id DESC LIMIT 1`,
      [deviceToken]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      await query(
        `UPDATE users SET name = $1, avatar_style = $2, last_active_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [name, avatarStyle, user.id]
      );
      const refreshed = await query(`SELECT * FROM users WHERE id = $1`, [user.id]);
      user = refreshed.rows[0];
    } else {
      await query(
        `INSERT INTO users (name, class_name, avatar_style, device_token) VALUES ($1, '', $2, $3)`,
        [name, avatarStyle, deviceToken]
      );
      const created = await query(
        `SELECT * FROM users WHERE device_token = $1 ORDER BY id DESC LIMIT 1`,
        [deviceToken]
      );
      user = created.rows[0];
      addServerLog('USER', `Pengguna baru terdaftar (Device Terisolasi): ${name} [ID: ${user?.id}]`);
    }

    res.json({ user });
  } catch (err) {
    addServerLog('ERROR', `identify error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat profil pengguna.' });
  }
});

// WIPE & LOGOUT ENDPOINT (Menghapus seluruh data sementara saat siswa logout)
app.post('/api/users/:userId/wipe', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.body?.deviceToken || ''
    ).trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'User ID tidak valid.' });
    }

    if (!deviceToken) {
      return res.status(401).json({ error: 'Device token diperlukan.' });
    }

    // Verifikasi kepemilikan data (C3 IDOR fix: cegah overwrite dan tolak akses jika token tidak cocok)
    const user = await verifyUserOwnership(userId, deviceToken);
    if (!user) {
      return res.status(403).json({ error: 'Akses ditolak: token perangkat tidak sesuai.' });
    }

    // Hapus seluruh data percakapan, sesi, dan profil siswa secara permanen
    await query(`DELETE FROM chat_messages WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM chat_sessions WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM counselor_requests WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM user_saved_tips WHERE user_id = $1`, [userId]);
    await query(`DELETE FROM emergency_alerts WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM users WHERE id = $1`, [userId]);

    addServerLog('USER', `Data sesi & profil user ID ${userId} telah dibersihkan secara permanen (Logout Wipe).`);
    res.json({ ok: true, message: 'Seluruh data sesi kamu telah dihapus secara permanen demi privasimu.' });
  } catch (err) {
    addServerLog('ERROR', `wipe error: ${err.message}`);
    res.status(500).json({ error: 'Gagal membersihkan data sesi pengguna.' });
  }
});

app.get('/api/users/:userId/sessions', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.query.deviceToken || ''
    ).trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'User ID tidak valid.' });
    }

    const staffUser = getAuthUser(req);
    if (!staffUser) {
      if (!deviceToken) {
        return res.status(401).json({ error: 'Device token diperlukan.' });
      }
      const user = await verifyUserOwnership(userId, deviceToken);
      if (!user) {
        return res.status(403).json({ error: 'Akses ditolak: token perangkat tidak sesuai.' });
      }
    }

    const sessionsRes = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
        (SELECT m.content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message
       FROM chat_sessions s
       WHERE s.user_id = $1
       ORDER BY s.updated_at DESC, s.id DESC`,
      [userId]
    );
    res.json({ sessions: sessionsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat riwayat percakapan.' });
  }
});

// Start a new counseling session using customizable AI Opening Format from Admin Panel
app.post('/api/users/:userId/sessions', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.body?.deviceToken || ''
    ).trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'User ID tidak valid.' });
    }

    if (!deviceToken) {
      return res.status(401).json({ error: 'Device token diperlukan.' });
    }

    const user = await verifyUserOwnership(userId, deviceToken);
    if (!user) {
      return res.status(403).json({ error: 'Akses ditolak: token perangkat tidak sesuai.' });
    }

    const { topicId } = req.body || {};
    const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[0];

    const aiSettings = await getAiSettings();

    await query(
      `INSERT INTO chat_sessions (user_id, topic_id, topic_title, status, stage)
       VALUES ($1, $2, $3, 'active', 3)`,
      [userId, topic.id, topic.title]
    );

    const sessionRes = await query(
      `SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [userId]
    );
    const session = sessionRes.rows[0];

    const rawTemplate =
      aiSettings.openingMode === 'per_topic' &&
      aiSettings.topicGreetings?.[topic.id]
        ? aiSettings.topicGreetings[topic.id]
        : aiSettings.globalGreeting || topic.greeting;

    const greetingText = formatOpeningMessage(rawTemplate, {
      userName: user.name,
      userClass: user.class_name,
      topicTitle: topic.title,
    });

    const footerText = aiSettings.openingFooter
      ? formatOpeningMessage(aiSettings.openingFooter, {
          userName: user.name,
          userClass: user.class_name,
          topicTitle: topic.title,
        })
      : '';

    const initialStructured = {
      checklist: [],
      tipBox: null,
      footerText,
      quickReplies: Array.isArray(aiSettings.openingQuickReplies)
        ? aiSettings.openingQuickReplies.filter(Boolean)
        : [],
      isClosing: false,
    };

    await query(
      `INSERT INTO chat_messages (session_id, user_id, sender, content, structured_json)
       VALUES ($1, $2, 'ai', $3, $4)`,
      [session.id, userId, greetingText, JSON.stringify(initialStructured)]
    );

    const messagesRes = await query(
      `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`,
      [session.id]
    );

    res.status(201).json({
      session,
      messages: messagesRes.rows.map((m) => ({
        ...m,
        structured: parseStructured(m.structured_json),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memulai sesi konseling.' });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.query.deviceToken || ''
    ).trim();

    const sessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
      sessionId,
    ]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
    }

    const session = sessionRes.rows[0];
    const staffUser = getAuthUser(req);

    if (!staffUser) {
      if (!deviceToken) {
        return res.status(401).json({ error: 'Device token diperlukan untuk melihat sesi konseling.' });
      }
      const user = await verifyUserOwnership(session.user_id, deviceToken);
      if (!user) {
        return res.status(403).json({ error: 'Akses ditolak: Anda tidak memiliki izin untuk sesi konseling ini.' });
      }
    }

    const [messagesRes, userRes] = await Promise.all([
      query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [
        sessionId,
      ]),
      query(`SELECT * FROM users WHERE id = $1`, [session.user_id]),
    ]);

    res.json({
      session,
      user: userRes.rows[0] || null,
      messages: messagesRes.rows.map((m) => ({
        ...m,
        structured: parseStructured(m.structured_json),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat pesan sesi.' });
  }
});

app.post('/api/sessions/:sessionId/messages', async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const content = String(req.body?.content || '').trim().slice(0, 2000);
    const deviceToken = String(
      req.headers['x-device-token'] || req.body?.deviceToken || ''
    ).trim();

    if (!content) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    if (!deviceToken) {
      return res.status(401).json({ error: 'Device token diperlukan.' });
    }

    const sessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
      sessionId,
    ]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    const session = sessionRes.rows[0];

    // Verifikasi kepemilikan sesi (C3)
    const user = await verifyUserOwnership(session.user_id, deviceToken);
    if (!user) {
      return res.status(403).json({ error: 'Akses ditolak: Anda bukan pemilik sesi konseling ini.' });
    }

    const [historyRes, aiSettings] = await Promise.all([
      query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [
        sessionId,
      ]),
      getAiSettings(),
    ]);

    let aiReply;
    try {
      aiReply = await generateCounselorResponse({
        topicId: session.topic_id,
        userName: user.name,
        userMessage: content,
        conversationHistory: historyRes.rows,
        currentStage: Number(session.stage || 3),
        customSystemPersona: aiSettings.systemPersona,
      });
    } catch (aiErr) {
      console.error('[AI Generation Error]', aiErr.message);
      addServerLog(
        'ERROR',
        `Gagal menghasilkan balasan AI untuk ${user.name} (Sesi #${sessionId}): ${aiErr.message}`
      );
      return res.status(503).json({
        error:
          aiErr.userMessage ||
          'Layanan AI sedang mengalami gangguan atau batas kuota sementara. Silakan coba kirim pesanmu lagi beberapa saat.',
        detail: aiErr.message,
        code: aiErr.code || 'AI_SERVICE_UNAVAILABLE',
      });
    }

    if (!aiReply || !aiReply.content || !aiReply.content.trim()) {
      addServerLog(
        'ERROR',
        `Balasan AI kosong untuk ${user.name} (Sesi #${sessionId}).`
      );
      return res.status(502).json({
        error: 'Layanan AI mengembalikan respons kosong. Silakan coba kirim pesanmu kembali.',
        code: 'AI_EMPTY_RESPONSE',
      });
    }

    await query(
      `INSERT INTO chat_messages (session_id, user_id, sender, content, structured_json)
       VALUES ($1, $2, 'user', $3, NULL)`,
      [sessionId, session.user_id, content]
    );

    if (aiReply.usage) {
      await recordTokenUsage({
        sessionId,
        userId: session.user_id,
        usage: aiReply.usage,
      });
      addServerLog(
        'AI',
        `Balasan AI untuk ${user.name}: ${aiReply.usage.totalTokens} token (${aiReply.usage.latencyMs} ms)`
      );
    }

    const isEmergency = Boolean(aiReply.structured?.isEmergency);
    if (isEmergency) {
      const reason =
        aiReply.structured?.emergencyReason ||
        `Terdeteksi kondisi darurat pada pesan: "${content.slice(0, 120)}"`;
      const warningAi =
        aiReply.structured?.emergencyWarning ||
        `PERINGATAN DARURAT AI: Halo ${user.name}, kami mendeteksi kamu sedang dalam kondisi yang sangat berat dan darurat. Keselamatanmu adalah yang paling utama. Segera hubungi Konselor / Guru BK atau layanan darurat 119 ext 8.`;

      await Promise.all([
        query(
          `UPDATE users
           SET is_emergency = 1,
               emergency_level = 'critical',
               emergency_reason = $1,
               emergency_warning_ai = $2,
               emergency_updated_at = CURRENT_TIMESTAMP,
               last_active_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [reason, warningAi, session.user_id]
        ),
        query(
          `UPDATE chat_sessions
           SET is_emergency = 1,
               emergency_level = 'critical',
               emergency_reason = $1
           WHERE id = $2`,
          [reason, sessionId]
        ),
        query(
          `INSERT INTO emergency_alerts (user_id, session_id, severity, trigger_message, ai_warning_message, ai_assessment, status)
           VALUES ($1, $2, 'critical', $3, $4, $5, 'active')`,
          [session.user_id, sessionId, content, warningAi, reason]
        ),
      ]);

      addServerLog(
        'EMERGENCY',
        `🚨 DARURAT TERDETEKSI pada user "${user.name}" (Sesi #${sessionId}): ${reason}`
      );
    }

    await query(
      `INSERT INTO chat_messages (session_id, user_id, sender, content, structured_json)
       VALUES ($1, $2, 'ai', $3, $4)`,
      [
        sessionId,
        session.user_id,
        aiReply.content,
        JSON.stringify(aiReply.structured || {}),
      ]
    );

    // Rekam pembelajaran AI (H4 fix: dinonaktifkan otomatis untuk mencegah kebocoran data)
    recordConversationLearning({
      topicId: session.topic_id,
      userMessage: content,
      aiReplyContent: aiReply.content,
      sessionId,
    }).catch((learnErr) => {
      console.warn('[Auto-Learning Storage Background Warning]', learnErr.message);
    });

    const newStatus = aiReply.nextStage === 9 ? 'completed' : session.status;
    await query(
      `UPDATE chat_sessions
       SET stage = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [aiReply.nextStage, newStatus, sessionId]
    );

    const [updatedSessionRes, updatedUserRes, allMessagesRes] = await Promise.all([
      query(`SELECT * FROM chat_sessions WHERE id = $1`, [sessionId]),
      query(`SELECT * FROM users WHERE id = $1`, [session.user_id]),
      query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [
        sessionId,
      ]),
    ]);

    res.json({
      session: updatedSessionRes.rows[0],
      user: updatedUserRes.rows[0] || null,
      emergencyTriggered: isEmergency,
      messages: allMessagesRes.rows.map((m) => ({
        ...m,
        structured: parseStructured(m.structured_json),
      })),
    });
  } catch (err) {
    addServerLog('ERROR', `Chat AI error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memproses pesan konseling.' });
  }
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.query.deviceToken || ''
    ).trim();

    const sessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
      sessionId,
    ]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    const session = sessionRes.rows[0];

    const staffUser = getAuthUser(req);
    if (!staffUser) {
      if (!deviceToken) {
        return res.status(401).json({ error: 'Device token diperlukan.' });
      }
      const user = await verifyUserOwnership(session.user_id, deviceToken);
      if (!user) {
        return res.status(403).json({ error: 'Akses ditolak: Anda bukan pemilik sesi konseling ini.' });
      }
    }

    await query(`DELETE FROM chat_messages WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus riwayat percakapan.' });
  }
});

app.get('/api/users/:userId/counselor-requests', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.query.deviceToken || ''
    ).trim();

    const staffUser = getAuthUser(req);
    if (!staffUser) {
      if (!deviceToken) {
        return res.status(401).json({ error: 'Device token diperlukan.' });
      }
      const user = await verifyUserOwnership(userId, deviceToken);
      if (!user) {
        return res.status(403).json({ error: 'Akses ditolak.' });
      }
    }

    const result = await query(
      `SELECT * FROM counselor_requests WHERE user_id = $1 ORDER BY id DESC`,
      [userId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat jadwal konseling Guru BK.' });
  }
});

app.post('/api/users/:userId/counselor-requests', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.body?.deviceToken || ''
    ).trim();

    if (!deviceToken) {
      return res.status(401).json({ error: 'Device token diperlukan.' });
    }
    const user = await verifyUserOwnership(userId, deviceToken);
    if (!user) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const topicTitle = String(req.body?.topicTitle || '').trim().slice(0, 150);
    const preferredSchedule = String(
      req.body?.preferredSchedule || 'Jam Istirahat / Sepulang Sekolah'
    )
      .trim()
      .slice(0, 100);
    const urgency = String(req.body?.urgency || 'normal').trim().slice(0, 30);
    const message = String(req.body?.message || '').trim().slice(0, 1500);

    if (!message || !topicTitle) {
      return res.status(400).json({ error: 'Topik dan pesan konseling wajib diisi.' });
    }

    await query(
      `INSERT INTO counselor_requests (user_id, topic_title, preferred_schedule, urgency, message, status, counselor_reply)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, topicTitle, preferredSchedule, urgency, message, 'Menunggu Persetujuan Guru BK', '']
    );

    addServerLog('BK', `Pengajuan konseling Guru BK baru dari user #${userId}`);
    const result = await query(
      `SELECT * FROM counselor_requests WHERE user_id = $1 ORDER BY id DESC`,
      [userId]
    );
    res.status(201).json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim permintaan ke Guru BK.' });
  }
});

app.get('/api/content/extras', async (req, res) => {
  try {
    const userId = Number(req.query.userId || 0);
    const [tipsRes, articlesRes, videosRes, savedRes] = await Promise.all([
      query(`SELECT * FROM content_tips ORDER BY created_at ASC`),
      query(`SELECT * FROM content_articles ORDER BY created_at ASC`),
      query(`SELECT * FROM content_videos ORDER BY created_at ASC`),
      userId > 0
        ? query(`SELECT tip_id FROM user_saved_tips WHERE user_id = $1`, [userId])
        : Promise.resolve({ rows: [] }),
    ]);

    const tips =
      tipsRes.rows.length > 0
        ? tipsRes.rows.map((t) => ({
            id: t.id,
            category: t.category,
            title: t.title,
            summary: t.summary || t.description || '',
            points: parseStructured(t.points_json) || (t.summary ? [t.summary] : []),
          }))
        : SOCIAL_TIPS;
    const articles =
      articlesRes.rows.length > 0
        ? articlesRes.rows.map((a) => ({
            id: a.id,
            category: a.category,
            title: a.title,
            readTime: a.read_time || '3 menit',
            excerpt: a.excerpt,
            content: parseStructured(a.content_json) || [a.excerpt],
          }))
        : ARTICLES;

    const videos =
      videosRes.rows.length > 0
        ? videosRes.rows.map((v) => ({
            id: v.id,
            category: v.category,
            title: v.title,
            duration: v.duration || '5:00',
            description: v.description,
            youtubeId: v.youtube_id,
            embedUrl: v.embed_url || `https://www.youtube-nocookie.com/embed/${v.youtube_id}`,
            keyTakeaways: parseStructured(v.key_takeaways_json) || [],
          }))
        : EDUCATIONAL_VIDEOS;

    res.json({
      tips,
      articles,
      videos,
      savedTipIds: savedRes.rows.map((r) => r.tip_id),
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat konten tambahan.' });
  }
});

app.post('/api/users/:userId/saved-tips', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceToken = String(
      req.headers['x-device-token'] || req.body?.deviceToken || ''
    ).trim();

    if (!deviceToken) {
      return res.status(401).json({ error: 'Device token diperlukan.' });
    }
    const user = await verifyUserOwnership(userId, deviceToken);
    if (!user) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const tipId = String(req.body?.tipId || '').trim().slice(0, 60);
    if (!tipId) {
      return res.status(400).json({ error: 'Tip ID tidak valid.' });
    }

    const existing = await query(
      `SELECT id FROM user_saved_tips WHERE user_id = $1 AND tip_id = $2`,
      [userId, tipId]
    );
    if (existing.rows.length > 0) {
      await query(`DELETE FROM user_saved_tips WHERE user_id = $1 AND tip_id = $2`, [
        userId,
        tipId,
      ]);
    } else {
      await query(`INSERT INTO user_saved_tips (user_id, tip_id) VALUES ($1, $2)`, [
        userId,
        tipId,
      ]);
    }
    const savedRes = await query(
      `SELECT tip_id FROM user_saved_tips WHERE user_id = $1`,
      [userId]
    );
    res.json({ savedTipIds: savedRes.rows.map((r) => r.tip_id) });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan tips.' });
  }
});

// ============================================================================
// ADMIN & TEACHER AUTHENTICATION (C1, C2, C5)
// ============================================================================

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '').trim();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || expected === 'admin123' || expected.length < 8) {
    addServerLog('ERROR', 'ADMIN_PASSWORD belum dikonfigurasi dengan aman di .env.');
    return res.status(500).json({
      error: 'ADMIN_PASSWORD belum dikonfigurasi dengan aman di file .env server. Silakan set password kuat (min 12 karakter).',
    });
  }

  const pBuf = Buffer.from(password);
  const expBuf = Buffer.from(expected);
  const isValid = pBuf.length === expBuf.length && crypto.timingSafeEqual(pBuf, expBuf);

  if (!isValid) {
    addServerLog('WARN', 'Percobaan login Admin gagal (password salah).');
    return res.status(401).json({ error: 'Password Admin tidak sesuai.' });
  }

  addServerLog('ADMIN', 'Admin berhasil login ke panel kontrol.');
  const token = createToken({ role: 'admin', username: 'admin', name: 'Administrator' });

  res.cookie('sociacare_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 3600 * 1000,
  });

  res.json({
    ok: true,
    token,
  });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('sociacare_admin_token');
  res.json({ ok: true });
});

app.post('/api/teacher/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const teacherRes = await query(
      `SELECT * FROM teachers WHERE LOWER(username) = LOWER($1) AND is_active = 1`,
      [username]
    );

    let activeUser = null;
    let teacherName = 'Guru BK';
    let teacherRole = 'guru_bk';

    if (teacherRes.rows.length > 0) {
      const teacher = teacherRes.rows[0];
      let matches = false;

      if (teacher.password && teacher.password.startsWith('$2')) {
        matches = bcrypt.compareSync(password, teacher.password);
      } else if (teacher.password) {
        // Plaintext legacy verification with constant-time equality
        const tBuf = Buffer.from(teacher.password);
        const pBuf = Buffer.from(password);
        if (tBuf.length === pBuf.length && crypto.timingSafeEqual(tBuf, pBuf)) {
          matches = true;
          // Transparently upgrade to bcrypt hash
          try {
            const hashed = bcrypt.hashSync(password, 12);
            await query(`UPDATE teachers SET password = $1 WHERE id = $2`, [hashed, teacher.id]);
          } catch (upgradeErr) {
            console.warn('[Teacher Pwd Auto-Upgrade Warn]', upgradeErr.message);
          }
        }
      }

      if (matches) {
        activeUser = teacher.username;
        teacherName = teacher.name;
        teacherRole = 'guru_bk';
      }
    }

    if (!activeUser) {
      addServerLog('WARN', `Percobaan login Guru BK gagal untuk username "${username}".`);
      return res.status(401).json({ error: 'Username atau Password Guru BK tidak sesuai.' });
    }

    addServerLog('TEACHER', `Guru BK (${teacherName} / @${activeUser}) berhasil login.`);
    const token = createToken({
      role: teacherRole,
      username: activeUser,
      name: teacherName,
    });

    res.cookie('sociacare_teacher_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000,
    });

    res.json({
      ok: true,
      token,
      role: teacherRole,
      username: activeUser,
      name: teacherName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses login Guru BK.' });
  }
});

app.post('/api/teacher/logout', (req, res) => {
  res.clearCookie('sociacare_teacher_token');
  res.json({ ok: true });
});

app.get('/api/admin/server-stats', requireAdmin, async (req, res) => {
  try {
    const [
      counts,
      tokenSummaryRes,
      tokenLogsRes,
      tokenByUserRes,
      emergencyAlertsRes,
      emergencyUsersRes,
    ] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM users) AS users_count,
          (SELECT COUNT(*) FROM users WHERE is_emergency = 1) AS emergency_users_count,
          (SELECT COUNT(*) FROM chat_sessions) AS sessions_count,
          (SELECT COUNT(*) FROM chat_messages) AS messages_count,
          (SELECT COUNT(*) FROM counselor_requests) AS bk_count,
          (SELECT COUNT(*) FROM user_saved_tips) AS saved_tips_count,
          (SELECT COUNT(*) FROM ai_usage_logs) AS token_logs_count,
          (SELECT COUNT(*) FROM emergency_alerts WHERE status = 'active') AS active_alerts_count
      `),
      query(`
        SELECT
          COUNT(*) AS total_requests,
          COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
          COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
          COALESCE(SUM(thought_tokens), 0) AS thought_tokens,
          COALESCE(SUM(total_tokens), 0) AS total_tokens,
          COALESCE( CAST(AVG(latency_ms) AS INTEGER), 0) AS avg_latency_ms
        FROM ai_usage_logs
      `),
      query(`
        SELECT l.*, u.name AS user_name, s.topic_title
        FROM ai_usage_logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN chat_sessions s ON s.id = l.session_id
        ORDER BY l.id DESC
        LIMIT 30
      `),
      query(`
        SELECT
          u.id AS user_id,
          u.name AS user_name,
          COUNT(l.id) AS request_count,
          COALESCE(SUM(l.prompt_tokens), 0) AS prompt_tokens,
          COALESCE(SUM(l.completion_tokens), 0) AS completion_tokens,
          COALESCE(SUM(l.thought_tokens), 0) AS thought_tokens,
          COALESCE(SUM(l.total_tokens), 0) AS total_tokens
        FROM ai_usage_logs l
        LEFT JOIN users u ON u.id = l.user_id
        GROUP BY u.id, u.name
        ORDER BY total_tokens DESC
      `),
      query(`
        SELECT a.*, u.name AS user_name, u.avatar_style, s.topic_title
        FROM emergency_alerts a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN chat_sessions s ON s.id = a.session_id
        ORDER BY a.id DESC
        LIMIT 30
      `),
      query(`
        SELECT id, name, avatar_style, is_emergency, emergency_level, emergency_reason, emergency_warning_ai, emergency_updated_at
        FROM users
        WHERE is_emergency = 1
        ORDER BY emergency_updated_at DESC, id DESC
      `),
    ]);

    const dbFilePath = path.join(__dirname, 'sociacare.sql.db');
    let dbFileSizeBytes = 0;
    if (fs.existsSync(dbFilePath)) {
      dbFileSizeBytes = fs.statSync(dbFilePath).size;
    }

    const mem = process.memoryUsage();
    const nets = os.networkInterfaces();
    const ipAddresses = [];
    for (const iface of Object.values(nets)) {
      for (const cfg of iface || []) {
        if (cfg.family === 'IPv4' && !cfg.internal) {
          ipAddresses.push(cfg.address);
        }
      }
    }

    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    const maskedKey = rawKey
      ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`
      : 'Belum diatur';

    const rawDeepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    const maskedDeepseekKey = rawDeepseekKey
      ? `${rawDeepseekKey.slice(0, 6)}...${rawDeepseekKey.slice(-4)}`
      : 'Belum diatur';

    const tSum = tokenSummaryRes.rows[0] || {};

    res.json({
      server: {
        hostname: os.hostname(),
        platform: `${os.type()} ${os.release()} (${os.arch()})`,
        nodeVersion: process.version,
        pid: process.pid,
        port: PORT,
        bindAddress: '0.0.0.0',
        lanIps: ipAddresses,
        uptimeSeconds: Math.floor(process.uptime()),
        osUptimeSeconds: Math.floor(os.uptime()),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'CPU',
        loadAvg: os.loadavg(),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          osTotal: os.totalmem(),
          osFree: os.freemem(),
        },
        geminiConfigured: Boolean(rawKey),
        geminiMaskedKey: maskedKey,
        geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        deepseekConfigured: Boolean(rawDeepseekKey),
        deepseekMaskedKey: maskedDeepseekKey,
        deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      },
      database: {
        ...getEngineInfo(),
        fileSizeBytes: dbFileSizeBytes,
        tables: {
          users: Number(counts.rows[0]?.users_count || 0),
          emergency_users: Number(counts.rows[0]?.emergency_users_count || 0),
          chat_sessions: Number(counts.rows[0]?.sessions_count || 0),
          chat_messages: Number(counts.rows[0]?.messages_count || 0),
          counselor_requests: Number(counts.rows[0]?.bk_count || 0),
          user_saved_tips: Number(counts.rows[0]?.saved_tips_count || 0),
          ai_usage_logs: Number(counts.rows[0]?.token_logs_count || 0),
          emergency_alerts: Number(counts.rows[0]?.active_alerts_count || 0),
        },
      },
      emergency: {
        activeUsersCount: Number(counts.rows[0]?.emergency_users_count || 0),
        activeAlertsCount: Number(counts.rows[0]?.active_alerts_count || 0),
        emergencyUsers: emergencyUsersRes.rows,
        recentAlerts: emergencyAlertsRes.rows,
      },
      tokenUsage: {
        summary: {
          totalRequests: Number(tSum.total_requests || 0),
          promptTokens: Number(tSum.prompt_tokens || 0),
          completionTokens: Number(tSum.completion_tokens || 0),
          thoughtTokens: Number(tSum.thought_tokens || 0),
          totalTokens: Number(tSum.total_tokens || 0),
          avgLatencyMs: Number(tSum.avg_latency_ms || 0),
        },
        byUser: tokenByUserRes.rows,
        recentLogs: tokenLogsRes.rows,
      },
      logs: serverLogs.slice(0, 80),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get & Update AI Opening Greeting Format and Persona Settings
app.get('/api/admin/ai-settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getAiSettings();
    res.json({ settings, defaults: DEFAULT_AI_SETTINGS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/ai-settings', requireAdmin, async (req, res) => {
  try {
    const updated = await saveAiSettings(req.body || {});
    addServerLog('ADMIN', 'Format pembuka AI & persona konselor diperbarui oleh Admin.');
    res.json({ ok: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/test-gemini', requireAdmin, async (req, res) => {
  const t0 = Date.now();
  try {
    const aiSettings = await getAiSettings();
    const reply = await generateCounselorResponse({
      topicId: 'friendship',
      userName: 'Siswa Uji',
      userClass: 'XI',
      userMessage: 'Halo SociaCare AI, apakah server AI aktif?',
      conversationHistory: [],
      currentStage: 3,
      customSystemPersona: aiSettings.systemPersona,
    });
    const latencyMs = Date.now() - t0;
    if (reply.usage) {
      await recordTokenUsage({
        sessionId: null,
        userId: null,
        usage: reply.usage,
      });
    }
    addServerLog(
      'ADMIN',
      `Tes koneksi Gemini AI berhasil (${latencyMs} ms, ${
        reply.usage?.totalTokens || 0
      } token).`
    );
    res.json({
      ok: true,
      latencyMs,
      usage: reply.usage,
      sampleReply: reply.content,
    });
  } catch (err) {
    addServerLog('ERROR', `Tes koneksi Gemini AI gagal: ${err.message}`);
    res.status(500).json({
      ok: false,
      latencyMs: Date.now() - t0,
      error: err.message,
    });
  }
});

app.post('/api/admin/test-deepseek', requireAdmin, async (req, res) => {
  const t0 = Date.now();
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      latencyMs: 0,
      error: 'DEEPSEEK_API_KEY belum dikonfigurasi di server/.env',
    });
  }

  try {
    const aiSettings = await getAiSettings();
    const reply = await callDeepSeekApi({
      apiKey,
      topic: TOPICS[0],
      userName: 'Admin Tester',
      userMessage: 'Halo DeepSeek, ini adalah tes koneksi dari SociaCare AI Admin.',
      conversationHistory: [],
      nextStage: 3,
      customSystemPersona: aiSettings.systemPersona,
      keywordEmergency: false,
      isClosingRequested: false,
      isImageRequested: false,
    });
    const latencyMs = Date.now() - t0;
    if (reply.usage) {
      await recordTokenUsage({
        sessionId: null,
        userId: null,
        usage: reply.usage,
      });
    }
    addServerLog(
      'ADMIN',
      `Tes koneksi DeepSeek AI berhasil (${latencyMs} ms, ${
        reply.usage?.totalTokens || 0
      } token).`
    );
    res.json({
      ok: true,
      latencyMs,
      usage: reply.usage,
      sampleReply: reply.content,
    });
  } catch (err) {
    addServerLog('ERROR', `Tes koneksi DeepSeek AI gagal: ${err.message}`);
    res.status(500).json({
      ok: false,
      latencyMs: Date.now() - t0,
      error: err.message,
    });
  }
});

app.post('/api/admin/config', requireAdmin, (req, res) => {
  // Security fix (C2, H5): Dinonaktifkan demi keamanan. File .env tidak boleh dimodifikasi melalui Web API.
  res.status(403).json({
    error: 'Modifikasi konfigurasi (.env) via Web API dinonaktifkan demi keamanan server. Kelola file server/.env secara aman via SSH/CLI.',
  });
});

app.post('/api/admin/db-maintenance', requireAdmin, async (req, res) => {
  try {
    const { action } = req.body || {};
    if (action === 'vacuum') {
      await query('VACUUM');
      addServerLog('ADMIN', 'Database VACUUM / optimasi selesai.');
      return res.json({ ok: true, message: 'Optimasi & VACUUM database berhasil.' });
    }
    if (action === 'clear_logs') {
      serverLogs.length = 0;
      addServerLog('ADMIN', 'Log memori server dibersihkan.');
      return res.json({ ok: true, message: 'Log aktivitas server berhasil dibersihkan.' });
    }
    if (action === 'clear_token_logs') {
      await query('DELETE FROM ai_usage_logs');
      addServerLog('ADMIN', 'Riwayat penggunaan token AI di-reset oleh Admin.');
      return res.json({
        ok: true,
        message: 'Statistik & riwayat penggunaan token AI berhasil di-reset.',
      });
    }
    if (action === 'clear_sessions') {
      await query('DELETE FROM chat_messages');
      await query('DELETE FROM chat_sessions');
      addServerLog('ADMIN', 'Seluruh sesi chat & pesan dihapus oleh Admin.');
      return res.json({
        ok: true,
        message: 'Seluruh sesi konseling dan pesan chat berhasil dikosongkan.',
      });
    }
    if (action === 'clear_bk') {
      await query('DELETE FROM counselor_requests');
      addServerLog('ADMIN', 'Seluruh pengajuan Guru BK dihapus oleh Admin.');
      return res.json({
        ok: true,
        message: 'Seluruh data pengajuan Guru BK berhasil dikosongkan.',
      });
    }
    if (action === 'reset_all') {
      await query('DELETE FROM chat_messages');
      await query('DELETE FROM chat_sessions');
      await query('DELETE FROM counselor_requests');
      await query('DELETE FROM user_saved_tips');
      await query('DELETE FROM ai_usage_logs');
      await query('DELETE FROM users');
      addServerLog('WARN', 'Database di-reset penuh oleh Admin.');
      return res.json({
        ok: true,
        message: 'Seluruh tabel database berhasil di-reset ke kondisi kosong.',
      });
    }
    res.status(400).json({ error: 'Aksi maintenance tidak dikenali.' });
  } catch (err) {
    addServerLog('ERROR', `db-maintenance error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menjalankan pemeliharaan database.' });
  }
});

app.get('/api/admin/export', requireAdmin, async (req, res) => {
  try {
    const [users, sessions, messages, bkRequests, savedTips, tokenLogs, settings] =
      await Promise.all([
        query('SELECT * FROM users ORDER BY id ASC'),
        query('SELECT * FROM chat_sessions ORDER BY id ASC'),
        query('SELECT * FROM chat_messages ORDER BY id ASC'),
        query('SELECT * FROM counselor_requests ORDER BY id ASC'),
        query('SELECT * FROM user_saved_tips ORDER BY id ASC'),
        query('SELECT * FROM ai_usage_logs ORDER BY id ASC'),
        query('SELECT * FROM app_settings'),
      ]);

    addServerLog('ADMIN', 'Admin mengunduh backup JSON database lengkap.');
    res.json({
      exportedAt: new Date().toISOString(),
      engine: getEngineInfo(),
      tables: {
        users: users.rows,
        chat_sessions: sessions.rows,
        chat_messages: messages.rows,
        counselor_requests: bkRequests.rows,
        user_saved_tips: savedTips.rows,
        ai_usage_logs: tokenLogs.rows,
        app_settings: settings.rows,
      },
    });
  } catch (err) {
    addServerLog('ERROR', `export error: ${err.message}`);
    res.status(500).json({ error: 'Gagal mengekspor data server.' });
  }
});

app.get('/api/admin/users', requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*,
        (SELECT COUNT(*) FROM chat_sessions s WHERE s.user_id = u.id) AS session_count,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.user_id = u.id) AS message_count,
        (SELECT COUNT(*) FROM counselor_requests c WHERE c.user_id = u.id) AS bk_count,
        (SELECT COUNT(*) FROM user_saved_tips t WHERE t.user_id = u.id) AS saved_tips_count,
        (SELECT COALESCE(SUM(l.total_tokens), 0) FROM ai_usage_logs l WHERE l.user_id = u.id) AS total_tokens_used
      FROM users u
      ORDER BY u.last_active_at DESC, u.id DESC
    `);
    res.json({ users: result.rows });
  } catch (err) {
    addServerLog('ERROR', `load users error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat daftar pengguna.' });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const avatarStyle =
      req.body?.avatarStyle === 'student-male' ? 'student-male' : 'student-female';

    if (!name) {
      return res.status(400).json({ error: 'Nama wajib diisi.' });
    }

    await query(
      `INSERT INTO users (name, class_name, avatar_style) VALUES ($1, '', $2)`,
      [name, avatarStyle]
    );
    addServerLog('ADMIN', `Admin menambahkan user baru: ${name}`);
    res.status(201).json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `create user error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menambahkan data pengguna.' });
  }
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const avatarStyle =
      req.body?.avatarStyle === 'student-male' ? 'student-male' : 'student-female';

    if (!name) {
      return res.status(400).json({ error: 'Nama wajib diisi.' });
    }

    await query(
      `UPDATE users SET name = $1, avatar_style = $2 WHERE id = $3`,
      [name, avatarStyle, userId]
    );
    addServerLog('ADMIN', `Admin memperbarui data user #${userId} (${name})`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `update user error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui data pengguna.' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    await query('DELETE FROM emergency_alerts WHERE user_id = $1', [userId]);
    await query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
    await query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
    await query('DELETE FROM counselor_requests WHERE user_id = $1', [userId]);
    await query('DELETE FROM user_saved_tips WHERE user_id = $1', [userId]);
    await query('DELETE FROM ai_usage_logs WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);
    addServerLog('ADMIN', `Admin menghapus user #${userId} beserta seluruh datanya.`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete user error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus pengguna.' });
  }
});

// Toggle or Resolve User Emergency Status from Admin / Guru BK Panel
app.post('/api/admin/users/:id/emergency', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const isEmergency = Boolean(req.body?.isEmergency);
    const reason = String(
      req.body?.reason ||
        (isEmergency ? 'Ditetapkan darurat oleh Konselor / Guru BK' : '')
    ).trim();
    const warningAi = String(
      req.body?.warningAi ||
        (isEmergency
          ? 'PERINGATAN DARURAT: Konselor / Guru BK menandai kondisi kamu memerlukan pendampingan segera. Kami siap membantumu sekarang.'
          : '')
    ).trim();

    if (isEmergency) {
      await query(
        `UPDATE users
         SET is_emergency = 1,
             emergency_level = 'critical',
             emergency_reason = $1,
             emergency_warning_ai = $2,
             emergency_updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [reason, warningAi, userId]
      );
      addServerLog('EMERGENCY', `Petugas mengaktifkan status DARURAT untuk user #${userId}`);
    } else {
      await Promise.all([
        query(
          `UPDATE users
           SET is_emergency = 0,
               emergency_level = 'normal',
               emergency_reason = '',
               emergency_warning_ai = ''
           WHERE id = $1`,
          [userId]
        ),
        query(
          `UPDATE chat_sessions
           SET is_emergency = 0,
               emergency_level = 'normal'
           WHERE user_id = $1`,
          [userId]
        ),
        query(
          `UPDATE emergency_alerts
           SET status = 'handled'
           WHERE user_id = $1`,
          [userId]
        ),
      ]);
      addServerLog('ADMIN', `Petugas menyelesaikan status darurat user #${userId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `emergency update error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui status darurat.' });
  }
});

app.get('/api/admin/users/:id/detail', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const [userRes, sessionsRes, messagesRes, bkRes, tokenRes, alertsRes] =
      await Promise.all([
        query('SELECT * FROM users WHERE id = $1', [userId]),
        query('SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY id DESC', [
          userId,
        ]),
        query('SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY id ASC', [
          userId,
        ]),
        query(
          'SELECT * FROM counselor_requests WHERE user_id = $1 ORDER BY id DESC',
          [userId]
        ),
        query(
          'SELECT COALESCE(SUM(total_tokens), 0) AS total_tokens, COUNT(*) AS calls FROM ai_usage_logs WHERE user_id = $1',
          [userId]
        ),
        query(
          'SELECT * FROM emergency_alerts WHERE user_id = $1 ORDER BY id DESC',
          [userId]
        ),
      ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    res.json({
      user: userRes.rows[0],
      sessions: sessionsRes.rows,
      messages: messagesRes.rows.map((m) => ({
        ...m,
        text: m.content,
        message: m.content,
        structured: parseStructured(m.structured_json),
      })),
      counselorRequests: bkRes.rows,
      tokenSummary: tokenRes.rows[0] || { total_tokens: 0, calls: 0 },
      emergencyAlerts: alertsRes.rows,
    });
  } catch (err) {
    addServerLog('ERROR', `user detail error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat detail pengguna.' });
  }
});

// Endpoint riwayat sesi percakapan siswa (untuk Admin & Portal Guru BK)
app.get('/api/admin/users/:id/history', requireTeacherOrAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const result = await query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
        (SELECT m.content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message
       FROM chat_sessions s
       WHERE s.user_id = $1
       ORDER BY s.updated_at DESC, s.id DESC`,
      [userId]
    );
    res.json({ ok: true, sessions: result.rows });
  } catch (err) {
    addServerLog('ERROR', `user history error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat riwayat sesi pengguna.' });
  }
});

// Endpoint transkrip pesan dalam sesi tertentu (untuk Admin & Portal Guru BK)
app.get('/api/admin/sessions/:id/messages', requireTeacherOrAdmin, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    const result = await query(
      `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );
    const messages = result.rows.map((m) => ({
      ...m,
      text: m.content,
      message: m.content,
      structured: parseStructured(m.structured_json),
    }));
    res.json({ ok: true, messages });
  } catch (err) {
    addServerLog('ERROR', `session messages error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat pesan percakapan sesi.' });
  }
});

app.get('/api/admin/sessions', requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, u.name AS user_name, u.class_name AS user_class,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
        (SELECT m.content FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message
      FROM chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.updated_at DESC, s.id DESC
    `);
    res.json({ sessions: result.rows });
  } catch (err) {
    addServerLog('ERROR', `sessions list error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat daftar sesi.' });
  }
});

app.get('/api/admin/counselor-requests', requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, u.name AS user_name, u.class_name AS user_class
      FROM counselor_requests c
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.id DESC
    `);
    res.json({ requests: result.rows });
  } catch (err) {
    addServerLog('ERROR', `counselor requests error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat jadwal konseling.' });
  }
});

app.put('/api/admin/counselor-requests/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const status = String(req.body?.status || 'Menunggu Konfirmasi Guru BK').trim();
    const counselorReply = String(req.body?.counselorReply || '').trim();

    await query(
      `UPDATE counselor_requests SET status = $1, counselor_reply = $2 WHERE id = $3`,
      [status, counselorReply, reqId]
    );
    addServerLog('ADMIN', `Status tiket Guru BK #${reqId} diperbarui -> ${status}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `update counselor request error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui permohonan konseling.' });
  }
});

app.delete('/api/admin/counselor-requests/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    await query('DELETE FROM counselor_requests WHERE id = $1', [reqId]);
    addServerLog('ADMIN', `Tiket Guru BK #${reqId} dihapus`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete counselor request error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus tiket konseling.' });
  }
});

// ==========================================
// TEACHER (GURU BK) ACCOUNT MANAGEMENT (BY ADMIN) - (C5 Password Hashing & Leaks Fix)
// ==========================================
app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    // C5 Fix: Exclude password from SELECT to prevent cleartext exposure
    const result = await query(
      `SELECT id, name, username, nip, phone, role, is_active, created_at, updated_at
       FROM teachers ORDER BY id ASC`
    );
    res.json({ teachers: result.rows });
  } catch (err) {
    addServerLog('ERROR', `teachers query error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat daftar Guru BK.' });
  }
});

app.post('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 60);
    const password = String(req.body?.password || '').trim();
    const nip = String(req.body?.nip || '').trim().slice(0, 60);
    const phone = String(req.body?.phone || '').trim().slice(0, 30);
    const role = String(req.body?.role || 'guru_bk').trim().slice(0, 30);

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nama, username, dan password Guru BK wajib diisi.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password Guru BK minimal harus 8 karakter demi keamanan.' });
    }

    // Check duplicate username
    const dupCheck = await query(
      `SELECT id FROM teachers WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `Username "${username}" sudah digunakan oleh akun lain.` });
    }

    // C5 Fix: Hash password with bcrypt cost 12
    const hashedPassword = bcrypt.hashSync(password, 12);

    await query(
      `INSERT INTO teachers (name, username, password, nip, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, username, hashedPassword, nip, phone, role, 1]
    );

    addServerLog('ADMIN', `Admin membuat akun Guru BK baru: ${name} (@${username})`);
    res.status(201).json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `create teacher error: ${err.message}`);
    res.status(500).json({ error: 'Gagal membuat akun Guru BK.' });
  }
});

app.put('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const teacherId = Number(req.params.id);
    const name = String(req.body?.name || '').trim().slice(0, 120);
    const username = String(req.body?.username || '').trim().toLowerCase().slice(0, 60);
    const password = String(req.body?.password || '').trim();
    const nip = String(req.body?.nip || '').trim().slice(0, 60);
    const phone = String(req.body?.phone || '').trim().slice(0, 30);
    const isActive = req.body?.isActive !== undefined ? (Number(req.body.isActive) ? 1 : 0) : 1;

    if (!name || !username) {
      return res.status(400).json({ error: 'Nama dan username wajib diisi.' });
    }

    // Check duplicate username on other teachers
    const dupCheck = await query(
      `SELECT id FROM teachers WHERE LOWER(username) = LOWER($1) AND id != $2`,
      [username, teacherId]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `Username "${username}" sudah digunakan oleh akun lain.` });
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password minimal harus 8 karakter demi keamanan.' });
      }
      const hashedPassword = bcrypt.hashSync(password, 12);
      await query(
        `UPDATE teachers
         SET name = $1, username = $2, password = $3, nip = $4, phone = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [name, username, hashedPassword, nip, phone, isActive, teacherId]
      );
    } else {
      await query(
        `UPDATE teachers
         SET name = $1, username = $2, nip = $3, phone = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [name, username, nip, phone, isActive, teacherId]
      );
    }

    addServerLog('ADMIN', `Admin memperbarui akun Guru BK ID #${teacherId} (${name})`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `update teacher error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui akun Guru BK.' });
  }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const teacherId = Number(req.params.id);
    await query(`DELETE FROM teachers WHERE id = $1`, [teacherId]);
    addServerLog('ADMIN', `Admin menghapus akun Guru BK ID #${teacherId}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete teacher error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus akun Guru BK.' });
  }
});

// C2 Fix: Endpoint SQL dinonaktifkan
app.post('/api/admin/sql', requireAdmin, (req, res) => {
  res.status(403).json({
    ok: false,
    error: 'Eksekusi query SQL mentah via Web API dinonaktifkan demi keamanan database (C2). Gunakan terminal psql / sqlite3 langsung via SSH.',
  });
});

// ============================================================================
// ADMIN CONTENT MANAGEMENT (TIPS, ARTIKEL, VIDEO)
// ============================================================================

// Strict YouTube ID extractor (M3 Fix)
function extractYoutubeId(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const match = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match && match[1] && /^[\w-]{11}$/.test(match[1]) ? match[1] : null;
}

// 1. TIPS
app.post('/api/admin/content/tips', requireTeacherOrAdmin, async (req, res) => {
  try {
    const category = String(req.body?.category || 'Umum').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const summary = String(req.body?.summary || req.body?.description || '').trim();
    let points = [];
    if (Array.isArray(req.body?.points)) {
      points = req.body.points.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof req.body?.points === 'string') {
      points = req.body.points
        .split('\n')
        .map((p) => p.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    } else if (typeof req.body?.description === 'string') {
      points = req.body.description
        .split('\n')
        .map((p) => p.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    if (!title || !summary) {
      return res.status(400).json({ error: 'Judul dan ringkasan/deskripsi tips wajib diisi.' });
    }

    if (points.length === 0) {
      points = [summary];
    }

    const tipId = `tip-custom-${Date.now()}`;
    await query(
      `INSERT INTO content_tips (id, category, title, summary, points_json) VALUES ($1, $2, $3, $4, $5)`,
      [tipId, category, title, summary, JSON.stringify(points)]
    );

    addServerLog('ADMIN', `Tips baru ditambahkan: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: tipId });
  } catch (err) {
    addServerLog('ERROR', `add tips error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menambahkan tips konseling.' });
  }
});

app.delete('/api/admin/content/tips/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const tipId = String(req.params.id);
    await query(`DELETE FROM content_tips WHERE id = $1`, [tipId]);
    addServerLog('ADMIN', `Tips dihapus ID: ${tipId}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete tips error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus tips.' });
  }
});

// 2. ARTICLES
app.post('/api/admin/content/articles', requireTeacherOrAdmin, async (req, res) => {
  try {
    const category = String(req.body?.category || 'Umum').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const readTime = String(req.body?.readTime || '3 menit').trim().slice(0, 50);
    const excerpt = String(req.body?.excerpt || '').trim();
    let contentArray = [];

    if (Array.isArray(req.body?.content)) {
      contentArray = req.body.content.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof req.body?.content === 'string') {
      contentArray = req.body.content
        .split('\n\n')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    if (!title || contentArray.length === 0) {
      return res.status(400).json({ error: 'Judul dan isi artikel wajib diisi.' });
    }

    const finalExcerpt = excerpt || contentArray[0]?.slice(0, 160) + '...';
    const artId = `art-custom-${Date.now()}`;

    await query(
      `INSERT INTO content_articles (id, category, title, read_time, excerpt, content_json) VALUES ($1, $2, $3, $4, $5, $6)`,
      [artId, category, title, readTime, finalExcerpt, JSON.stringify(contentArray)]
    );

    addServerLog('ADMIN', `Artikel baru ditambahkan: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: artId });
  } catch (err) {
    addServerLog('ERROR', `add article error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menambahkan artikel edukasi.' });
  }
});

app.delete('/api/admin/content/articles/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const artId = String(req.params.id);
    await query(`DELETE FROM content_articles WHERE id = $1`, [artId]);
    addServerLog('ADMIN', `Artikel dihapus ID: ${artId}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete article error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus artikel.' });
  }
});

app.put('/api/admin/content/articles/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const artId = String(req.params.id);
    const category = String(req.body?.category || 'Umum').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const readTime = String(req.body?.readTime || '3 menit').trim().slice(0, 50);
    const excerpt = String(req.body?.excerpt || '').trim();
    let contentArray = [];

    if (Array.isArray(req.body?.content)) {
      contentArray = req.body.content.map((p) => String(p).trim()).filter(Boolean);
    } else if (typeof req.body?.content === 'string') {
      contentArray = req.body.content
        .split('\n\n')
        .map((p) => p.trim())
        .filter(Boolean);
    }

    if (!title || contentArray.length === 0) {
      return res.status(400).json({ error: 'Judul dan isi artikel wajib diisi.' });
    }

    const finalExcerpt = excerpt || contentArray[0]?.slice(0, 160) + '...';

    const check = await query(`SELECT id FROM content_articles WHERE id = $1`, [artId]);
    if (check.rows.length === 0) {
      await query(
        `INSERT INTO content_articles (id, category, title, read_time, excerpt, content_json) VALUES ($1, $2, $3, $4, $5, $6)`,
        [artId, category, title, readTime, finalExcerpt, JSON.stringify(contentArray)]
      );
    } else {
      await query(
        `UPDATE content_articles SET category = $1, title = $2, read_time = $3, excerpt = $4, content_json = $5 WHERE id = $6`,
        [category, title, readTime, finalExcerpt, JSON.stringify(contentArray), artId]
      );
    }

    addServerLog('ADMIN', `Artikel diperbarui: "${title}" (ID: ${artId})`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `update article error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui artikel.' });
  }
});

// 3. VIDEOS
app.post('/api/admin/content/videos', requireTeacherOrAdmin, async (req, res) => {
  try {
    const category = String(req.body?.category || 'Bimbingan Sosial').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const duration = String(req.body?.duration || '5:00').trim().slice(0, 50);
    const description = String(req.body?.description || '').trim();
    const rawYoutube = String(req.body?.youtubeUrlOrId || req.body?.youtubeId || '').trim();
    const youtubeId = extractYoutubeId(rawYoutube);

    if (!title || !youtubeId) {
      return res.status(400).json({
        error: 'Judul dan URL/ID YouTube wajib diisi dan harus berupa ID YouTube 11 karakter yang valid.',
      });
    }

    let keyTakeaways = [];
    if (Array.isArray(req.body?.keyTakeaways)) {
      keyTakeaways = req.body.keyTakeaways.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof req.body?.keyTakeaways === 'string') {
      keyTakeaways = req.body.keyTakeaways
        .split('\n')
        .map((k) => k.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    const vidId = `vid-custom-${Date.now()}`;
    const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}`;

    await query(
      `INSERT INTO content_videos (id, category, title, duration, description, youtube_id, embed_url, key_takeaways_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        vidId,
        category,
        title,
        duration,
        description,
        youtubeId,
        embedUrl,
        JSON.stringify(keyTakeaways),
      ]
    );

    addServerLog('ADMIN', `Video edukasi baru ditambahkan: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: vidId });
  } catch (err) {
    addServerLog('ERROR', `add video error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menambahkan video.' });
  }
});

app.delete('/api/admin/content/videos/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const vidId = String(req.params.id);
    await query(`DELETE FROM content_videos WHERE id = $1`, [vidId]);
    addServerLog('ADMIN', `Video dihapus ID: ${vidId}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete video error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus video.' });
  }
});

app.put('/api/admin/content/videos/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const vidId = String(req.params.id);
    const category = String(req.body?.category || 'Bimbingan Sosial').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const duration = String(req.body?.duration || '5:00').trim().slice(0, 50);
    const description = String(req.body?.description || '').trim();
    const rawYoutube = String(req.body?.youtubeUrlOrId || req.body?.youtubeId || '').trim();
    const youtubeId = extractYoutubeId(rawYoutube);

    if (!title || !youtubeId) {
      return res.status(400).json({
        error: 'Judul dan URL/ID YouTube wajib diisi dan harus berupa ID YouTube 11 karakter yang valid.',
      });
    }

    let keyTakeaways = [];
    if (Array.isArray(req.body?.keyTakeaways)) {
      keyTakeaways = req.body.keyTakeaways.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof req.body?.keyTakeaways === 'string') {
      keyTakeaways = req.body.keyTakeaways
        .split('\n')
        .map((k) => k.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}`;

    const check = await query(`SELECT id FROM content_videos WHERE id = $1`, [vidId]);
    if (check.rows.length === 0) {
      await query(
        `INSERT INTO content_videos (id, category, title, duration, description, youtube_id, embed_url, key_takeaways_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [vidId, category, title, duration, description, youtubeId, embedUrl, JSON.stringify(keyTakeaways)]
      );
    } else {
      await query(
        `UPDATE content_videos SET category = $1, title = $2, duration = $3, description = $4, youtube_id = $5, embed_url = $6, key_takeaways_json = $7 WHERE id = $8`,
        [category, title, duration, description, youtubeId, embedUrl, JSON.stringify(keyTakeaways), vidId]
      );
    }

    addServerLog('ADMIN', `Video edukasi diperbarui: "${title}" (ID: ${vidId})`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `update video error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memperbarui video.' });
  }
});

// ==========================================
// AI CONTINUOUS LEARNING & REFERENCE PHOTOS
// ==========================================

// 1. GET LEARNING MEMORIES (Admin only)
app.get('/api/admin/learning-memory', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM ai_learning_memory ORDER BY id DESC LIMIT 100`
    );
    res.json({ memories: result.rows });
  } catch (err) {
    addServerLog('ERROR', `load learning memory error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat memori pembelajaran.' });
  }
});

// 2. ADD MANUAL LEARNING MEMORY (Curated by Admin only)
app.post('/api/admin/learning-memory', requireAdmin, async (req, res) => {
  try {
    const topicId = String(req.body?.topicId || 'general').trim();
    const category = String(req.body?.category || 'Kurasi Guru BK / Admin').trim();
    const queryPattern = String(req.body?.queryPattern || '').trim();
    const learnedInsight = String(req.body?.learnedInsight || '').trim();
    const keyTakeaway = String(req.body?.keyTakeaway || '').trim();

    if (!queryPattern || !learnedInsight) {
      return res.status(400).json({ error: 'Pola masalah siswa dan solusi wawasan wajib diisi.' });
    }

    const result = await query(
      `INSERT INTO ai_learning_memory (topic_id, category, query_pattern, learned_insight, key_takeaway)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [topicId, category, queryPattern, learnedInsight, keyTakeaway]
    );

    addServerLog('ADMIN', `Memori pembelajaran AI baru ditambahkan: "${queryPattern.slice(0, 50)}..."`);
    res.status(201).json({ ok: true, id: result.rows[0]?.id });
  } catch (err) {
    addServerLog('ERROR', `add learning memory error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menambahkan memori pembelajaran.' });
  }
});

// 3. DELETE LEARNING MEMORY
app.delete('/api/admin/learning-memory/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query(`DELETE FROM ai_learning_memory WHERE id = $1`, [id]);
    addServerLog('ADMIN', `Memori pembelajaran AI dihapus ID: ${id}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete learning memory error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus memori pembelajaran.' });
  }
});

// Helper for magic bytes validation (M4 Fix)
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }
  // WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return '.webp';
  }
  // GIF: GIF87a or GIF89a
  if (
    buffer.toString('ascii', 0, 6) === 'GIF87a' ||
    buffer.toString('ascii', 0, 6) === 'GIF89a'
  ) {
    return '.gif';
  }
  return null;
}

// 4. GET REFERENCE PHOTOS
app.get('/api/admin/photos', requireTeacherOrAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM ai_reference_photos ORDER BY id DESC`
    );
    res.json({ photos: result.rows });
  } catch (err) {
    addServerLog('ERROR', `load photos error: ${err.message}`);
    res.status(500).json({ error: 'Gagal memuat galeri foto.' });
  }
});

// 5. UPLOAD / ADD REFERENCE PHOTO (Hardened with magic bytes & size check - M4)
app.post(
  '/api/admin/photos',
  express.json({ limit: '10mb' }),
  requireTeacherOrAdmin,
  async (req, res) => {
    try {
      const title = String(req.body?.title || '').trim().slice(0, 150);
      const category = String(req.body?.category || 'Bimbingan Konseling').trim().slice(0, 80);
      const description = String(req.body?.description || '').trim();
      const tags = String(req.body?.tags || '').trim();
      let fileUrl = String(req.body?.fileUrl || '').trim();
      const base64Data = req.body?.base64Data;

      if (!title || (!fileUrl && !base64Data)) {
        return res.status(400).json({ error: 'Judul dan file foto / URL foto wajib diisi.' });
      }

      let fileName = '';
      let fileSize = 0;

      if (base64Data) {
        let buffer;
        const matches = String(base64Data).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64Data, 'base64');
        }

        // Limit size to max 5MB (M4 Fix)
        if (buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'Ukuran file melebihi batas maksimal 5MB.' });
        }

        // Validate magic bytes (M4 Fix)
        const ext = validateImageMagicBytes(buffer);
        if (!ext) {
          return res.status(400).json({
            error: 'Format gambar tidak valid. Hanya file PNG, JPEG, WebP, dan GIF yang diizinkan.',
          });
        }

        fileName = `ref_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        fileUrl = `/uploads/${fileName}`;
        fileSize = buffer.length;
      } else {
        // Disallow dangerous URL schemes (M3 Fix)
        if (
          !fileUrl.startsWith('/uploads/') &&
          !fileUrl.startsWith('/infographics/') &&
          !fileUrl.startsWith('https://')
        ) {
          return res.status(400).json({
            error: 'URL foto harus diawali dengan https:// atau berada di folder /uploads/',
          });
        }
        const cleanPath = fileUrl.split('?')[0].split('#')[0];
        fileName = path.basename(cleanPath) || `photo_${Date.now()}.png`;
      }

      const photoId = `photo_${Date.now()}`;
      await query(
        `INSERT INTO ai_reference_photos (id, title, category, description, file_url, file_name, file_size, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [photoId, title, category, description, fileUrl, fileName, fileSize, tags]
      );

      addServerLog('ADMIN', `Foto referensi konseling baru ditambahkan: "${title}" (${fileUrl})`);
      res.status(201).json({ ok: true, id: photoId, fileUrl, fileName });
    } catch (err) {
      addServerLog('ERROR', `upload photo error: ${err.message}`);
      res.status(500).json({ error: 'Gagal mengunggah foto referensi.' });
    }
  }
);

// 6. DELETE REFERENCE PHOTO (Hardened against path traversal - C2)
app.delete('/api/admin/photos/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const photoId = String(req.params.id);
    const existing = await query(`SELECT file_url FROM ai_reference_photos WHERE id = $1`, [
      photoId,
    ]);
    if (existing.rows.length > 0) {
      const fUrl = existing.rows[0].file_url;
      if (fUrl && fUrl.startsWith('/uploads/')) {
        const safeBaseName = path.basename(fUrl);
        const resolvedPath = path.resolve(uploadsDir, safeBaseName);
        // Canonical containment check (C2 Fix)
        if (resolvedPath.startsWith(uploadsDir + path.sep)) {
          if (fs.existsSync(resolvedPath)) {
            try {
              fs.unlinkSync(resolvedPath);
            } catch (_) {}
          }
        }
      }
    }
    await query(`DELETE FROM ai_reference_photos WHERE id = $1`, [photoId]);
    addServerLog('ADMIN', `Foto referensi dihapus ID: ${photoId}`);
    res.json({ ok: true });
  } catch (err) {
    addServerLog('ERROR', `delete photo error: ${err.message}`);
    res.status(500).json({ error: 'Gagal menghapus foto referensi.' });
  }
});

// Serve built React frontend in production (including /admin route)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// 4-argument Express error handler (M2 Fix: Prevent stack trace leaks in production)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format JSON pada permintaan tidak valid.' });
  }
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({ error: 'Terjadi kesalahan internal pada server.' });
});

// Bind Express strictly to 127.0.0.1 (C4 Fix: Close direct port 3001 exposure)
initDatabase().then(() => {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[SociaCare AI] Production server secured and running on http://127.0.0.1:${PORT}`);
  });
});
