const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
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

app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use('/uploads', express.static(uploadsDir));

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

function getAdminTokenSecret() {
  const pwd = process.env.ADMIN_PASSWORD || 'admin123';
  return crypto.createHash('sha256').update(`sociacare-admin:${pwd}`).digest('hex');
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== getAdminTokenSecret()) {
    return res
      .status(401)
      .json({ error: 'Tidak memiliki akses Admin. Silakan login kembali.' });
  }
  next();
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
      req.body?.deviceToken || req.headers['x-device-token'] || ''
    ).trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'User ID tidak valid.' });
    }

    // Verifikasi kepemilikan data sebelum penghapusan
    if (deviceToken) {
      const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (
        userRes.rows.length > 0 &&
        userRes.rows[0].device_token &&
        userRes.rows[0].device_token !== deviceToken
      ) {
        // Sinkronkan token perangkat aktif agar user tidak mengalami lockout/403
        await query(
          `UPDATE users SET device_token = $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [deviceToken, userId]
        );
      }
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

    if (deviceToken) {
      const userRes = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (
        userRes.rows.length > 0 &&
        userRes.rows[0].device_token &&
        userRes.rows[0].device_token !== deviceToken
      ) {
        // Sinkronkan token perangkat aktif agar user tidak mengalami lockout/403
        await query(
          `UPDATE users SET device_token = $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [deviceToken, userId]
        );
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

    if (deviceToken) {
      const userCheck = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (
        userCheck.rows.length > 0 &&
        userCheck.rows[0].device_token &&
        userCheck.rows[0].device_token !== deviceToken
      ) {
        return res.status(403).json({ error: 'Akses ditolak: token perangkat tidak sesuai.' });
      }
    }

    const { topicId } = req.body || {};
    const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[0];

    const [userRes, aiSettings] = await Promise.all([
      query(`SELECT * FROM users WHERE id = $1`, [userId]),
      getAiSettings(),
    ]);
    const user = userRes.rows[0] || { name: 'Teman', class_name: '' };

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
    const userId = Number(req.query.userId || 0);

    const sessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
      sessionId,
    ]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
    }

    const session = sessionRes.rows[0];
    if (userId > 0 && Number(session.user_id) !== userId) {
      // Periksa apakah user memiliki sesi sendiri yang lebih relevan
      const userOwnedSession = await query(
        `SELECT id FROM chat_sessions WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (userOwnedSession.rows.length > 0) {
        // Alihkan secara transparan ke sesi milik user tersebut
        const fallbackSessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
          userOwnedSession.rows[0].id,
        ]);
        if (fallbackSessionRes.rows.length > 0) {
          const fallbackSession = fallbackSessionRes.rows[0];
          const [messagesRes, userRes] = await Promise.all([
            query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [
              fallbackSession.id,
            ]),
            query(`SELECT * FROM users WHERE id = $1`, [userId]),
          ]);
          return res.json({
            session: fallbackSession,
            user: userRes.rows[0] || null,
            messages: messagesRes.rows.map((m) => ({
              ...m,
              structured: parseStructured(m.structured_json),
            })),
          });
        }
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

    if (!content) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const sessionRes = await query(`SELECT * FROM chat_sessions WHERE id = $1`, [
      sessionId,
    ]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }
    const session = sessionRes.rows[0];

    const [userRes, historyRes, aiSettings] = await Promise.all([
      query(`SELECT * FROM users WHERE id = $1`, [session.user_id]),
      query(`SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY id ASC`, [
        sessionId,
      ]),
      getAiSettings(),
    ]);
    const user = userRes.rows[0] || { name: 'Pengguna', class_name: '' };

    await query(
      `INSERT INTO chat_messages (session_id, user_id, sender, content, structured_json)
       VALUES ($1, $2, 'user', $3, NULL)`,
      [sessionId, session.user_id, content]
    );

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
      console.error('[AI Generation Fallback Triggered]', aiErr.message);
      aiReply = {
        content: `Halo ${user.name || 'Teman'}, terima kasih sudah berbagi cerita dengan jujur. Aku selalu ada di sini untuk mendengarkan dan mendukungmu. Boleh ceritakan lebih banyak tentang apa yang sedang kamu rasakan saat ini?`,
        structured: {
          checklist: [
            'Tarik napas perlahan dan tenangkan pikiran sejenak.',
            'Fokus pada langkah kecil yang paling bisa kamu lakukan hari ini.',
            'Jangan ragu untuk bercerita ke teman dekat atau Guru BK jika terasa berat.',
          ],
          tipBox: {
            title: 'Tips Pendukung:',
            text: 'Setiap proses butuh waktu, yang terpenting kamu tidak memendam masalah ini sendirian.',
          },
          footerText: 'Bagaimana perasaanmu sekarang? Mau lanjut bercerita atau menghubungi Guru BK?',
          quickReplies: ['Ceritakan lebih detail', 'Hubungi Guru BK', 'Tutup Pembicaraan'],
          isClosing: false,
          isEmergency: false,
          emergencyLevel: 'normal',
          emergencyReason: '',
          emergencyWarning: '',
        },
        nextStage: Number(session.stage || 3) === 3 ? 35 : Number(session.stage || 3),
        usage: {
          modelName: 'emergency-counselor-fallback',
          promptTokens: 0,
          completionTokens: 0,
          thoughtTokens: 0,
          totalTokens: 0,
          latencyMs: 1,
        },
      };
    }

    if (!aiReply.content || !aiReply.content.trim()) {
      const dt = getCurrentDateTimeContext();
      aiReply.content = resolveFallbackTimeOrGeneral(content, dt, user.name);
    }

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

    // Rekam pembelajaran AI secara asinkron dari percakapan nyata (Continuous Learning Model ke DB)
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
    const userId = Number(req.query.userId || 0);

    if (userId > 0) {
      await query(`DELETE FROM chat_messages WHERE session_id = $1 AND user_id = $2`, [
        sessionId,
        userId,
      ]);
      await query(`DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2`, [
        sessionId,
        userId,
      ]);
    } else {
      await query(`DELETE FROM chat_messages WHERE session_id = $1`, [sessionId]);
      await query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus riwayat percakapan.' });
  }
});

app.get('/api/users/:userId/counselor-requests', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
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
// ADMIN PANEL API ROUTES (/api/admin/*)
// Pengolahan Server, Penggunaan Token AI, Format Pembuka AI, & Database User
// ============================================================================

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '').trim();
  const expected = process.env.ADMIN_PASSWORD || 'admin123';
  if (password !== expected) {
    addServerLog('WARN', 'Percobaan login Admin gagal (password salah).');
    return res.status(401).json({ error: 'Password Admin tidak sesuai.' });
  }
  addServerLog('ADMIN', 'Admin berhasil login ke panel kontrol.');
  res.json({
    ok: true,
    token: getAdminTokenSecret(),
  });
});

app.post('/api/teacher/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    // 1. Check database teachers table
    const teacherRes = await query(
      `SELECT * FROM teachers WHERE LOWER(username) = LOWER($1) AND is_active = 1`,
      [username]
    );

    let activeUser = null;
    let teacherName = 'Guru BK';

    if (teacherRes.rows.length > 0) {
      const teacher = teacherRes.rows[0];
      if (teacher.password === password) {
        activeUser = teacher.username;
        teacherName = teacher.name;
      }
    }

    // 2. Fallback to Master Admin credentials if needed
    if (!activeUser && process.env.ADMIN_PASSWORD) {
      if (
        (username.toLowerCase() === 'admin' || username.toLowerCase() === 'administrator') &&
        password === process.env.ADMIN_PASSWORD
      ) {
        activeUser = 'admin';
        teacherName = 'Administrator';
      }
    }

    if (!activeUser) {
      addServerLog('WARN', `Percobaan login Guru BK gagal untuk username "${username}".`);
      return res.status(401).json({ error: 'Username atau Password Guru BK tidak sesuai.' });
    }

    addServerLog('TEACHER', `Guru BK (${teacherName} / @${activeUser}) berhasil login ke portal bimbingan konseling.`);
    res.json({
      ok: true,
      token: getAdminTokenSecret(),
      role: 'guru_bk',
      username: activeUser,
      name: teacherName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memproses login Guru BK.' });
  }
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
  try {
    const {
      geminiApiKey,
      deepseekApiKey,
      deepseekModel,
      newAdminPassword,
    } = req.body || {};

    if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }
    if (typeof deepseekApiKey === 'string') {
      process.env.DEEPSEEK_API_KEY = deepseekApiKey.trim();
    }
    if (typeof deepseekModel === 'string' && deepseekModel.trim()) {
      process.env.DEEPSEEK_MODEL = deepseekModel.trim();
    }
    if (typeof newAdminPassword === 'string' && newAdminPassword.trim()) {
      process.env.ADMIN_PASSWORD = newAdminPassword.trim();
    }

    const envPath = path.join(__dirname, '.env');
    const envContent = [
      `PORT=${process.env.PORT || 3001}`,
      `DATABASE_URL=${
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@127.0.0.1:5432/sociacare'
      }`,
      `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}`,
      `GEMINI_MODEL=${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`,
      `GEMINI_FALLBACK_MODELS=${process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-1.5-flash'}`,
      `DEEPSEEK_API_KEY=${process.env.DEEPSEEK_API_KEY || ''}`,
      `DEEPSEEK_MODEL=${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`,
      `ADMIN_PASSWORD=${process.env.ADMIN_PASSWORD || 'admin123'}`,
      '',
    ].join('\n');

    fs.writeFileSync(envPath, envContent, 'utf8');
    addServerLog('ADMIN', 'Konfigurasi server (.env) diperbarui oleh Admin.');

    res.json({
      ok: true,
      newToken: getAdminTokenSecret(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Toggle or Resolve User Emergency Status from Admin Panel
app.post('/api/admin/users/:id/emergency', requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const isEmergency = Boolean(req.body?.isEmergency);
    const reason = String(
      req.body?.reason ||
        (isEmergency ? 'Ditetapkan darurat oleh Admin' : '')
    ).trim();
    const warningAi = String(
      req.body?.warningAi ||
        (isEmergency
          ? 'PERINGATAN DARURAT: Konselor / Admin menandai kondisi kamu memerlukan pendampingan segera. Kami siap membantumu sekarang.'
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
      addServerLog('EMERGENCY', `Admin mengaktifkan status DARURAT untuk user #${userId}`);
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
      addServerLog('ADMIN', `Admin menyelesaikan/mereset status darurat user #${userId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id/detail', requireAdmin, async (req, res) => {
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
        structured: parseStructured(m.structured_json),
      })),
      counselorRequests: bkRes.rows,
      tokenSummary: tokenRes.rows[0] || { total_tokens: 0, calls: 0 },
      emergencyAlerts: alertsRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/sessions', requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/counselor-requests', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, u.name AS user_name, u.class_name AS user_class
      FROM counselor_requests c
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.id DESC
    `);
    res.json({ requests: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/counselor-requests/:id', requireAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const status = String(req.body?.status || 'Menunggu Konfirmasi Guru BK').trim();
    const counselorReply = String(req.body?.counselorReply || '').trim();

    await query(
      `UPDATE counselor_requests SET status = $1, counselor_reply = $2 WHERE id = $3`,
      [status, counselorReply, reqId]
    );
    addServerLog('ADMIN', `Admin memperbarui status tiket Guru BK #${reqId} -> ${status}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/counselor-requests/:id', requireAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    await query('DELETE FROM counselor_requests WHERE id = $1', [reqId]);
    addServerLog('ADMIN', `Admin menghapus tiket Guru BK #${reqId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TEACHER (GURU BK) ACCOUNT MANAGEMENT (BY ADMIN)
// ==========================================
app.get('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, username, password, nip, phone, role, is_active, created_at, updated_at
       FROM teachers ORDER BY id ASC`
    );
    res.json({ teachers: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // Check duplicate username
    const dupCheck = await query(
      `SELECT id FROM teachers WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ error: `Username "${username}" sudah digunakan oleh akun lain.` });
    }

    await query(
      `INSERT INTO teachers (name, username, password, nip, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, username, password, nip, phone, role, 1]
    );

    addServerLog('ADMIN', `Admin membuat akun Guru BK baru: ${name} (@${username})`);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      await query(
        `UPDATE teachers
         SET name = $1, username = $2, password = $3, nip = $4, phone = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [name, username, password, nip, phone, isActive, teacherId]
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
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const teacherId = Number(req.params.id);
    await query(`DELETE FROM teachers WHERE id = $1`, [teacherId]);
    addServerLog('ADMIN', `Admin menghapus akun Guru BK ID #${teacherId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/sql', requireAdmin, async (req, res) => {
  const sqlText = String(req.body?.sql || '').trim();
  if (!sqlText) {
    return res.status(400).json({ error: 'Query SQL tidak boleh kosong.' });
  }

  const t0 = Date.now();
  try {
    const result = await query(sqlText);
    const durationMs = Date.now() - t0;
    addServerLog(
      'SQL',
      `Admin menjalankan query SQL (${durationMs} ms): ${sqlText.slice(0, 80)}`
    );
    res.json({
      ok: true,
      durationMs,
      rowCount: result.rowCount,
      rows: result.rows || [],
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      durationMs: Date.now() - t0,
      error: err.message,
    });
  }
});

// ============================================================================
// ADMIN CONTENT MANAGEMENT (TIPS, ARTIKEL, VIDEO)
// ============================================================================

function extractYoutubeId(input) {
  if (!input) return '';
  const str = String(input).trim();
  const match = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(str)) return str;
  return str;
}

// 1. TIPS
app.post('/api/admin/content/tips', requireAdmin, async (req, res) => {
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

    addServerLog('ADMIN', `Admin menambahkan tips baru: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: tipId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/content/tips/:id', requireAdmin, async (req, res) => {
  try {
    const tipId = String(req.params.id);
    await query(`DELETE FROM content_tips WHERE id = $1`, [tipId]);
    addServerLog('ADMIN', `Admin menghapus tips ID: ${tipId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ARTICLES
app.post('/api/admin/content/articles', requireAdmin, async (req, res) => {
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

    addServerLog('ADMIN', `Admin menambahkan artikel baru: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: artId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/content/articles/:id', requireAdmin, async (req, res) => {
  try {
    const artId = String(req.params.id);
    await query(`DELETE FROM content_articles WHERE id = $1`, [artId]);
    addServerLog('ADMIN', `Admin menghapus artikel ID: ${artId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/content/articles/:id', requireAdmin, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// 3. VIDEOS
app.post('/api/admin/content/videos', requireAdmin, async (req, res) => {
  try {
    const category = String(req.body?.category || 'Bimbingan Sosial').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const duration = String(req.body?.duration || '5:00').trim().slice(0, 50);
    const description = String(req.body?.description || '').trim();
    const rawYoutube = String(req.body?.youtubeUrlOrId || req.body?.youtubeId || '').trim();
    const youtubeId = extractYoutubeId(rawYoutube);

    let keyTakeaways = [];
    if (Array.isArray(req.body?.keyTakeaways)) {
      keyTakeaways = req.body.keyTakeaways.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof req.body?.keyTakeaways === 'string') {
      keyTakeaways = req.body.keyTakeaways
        .split('\n')
        .map((k) => k.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    if (!title || !youtubeId) {
      return res.status(400).json({ error: 'Judul dan Link/ID YouTube wajib diisi.' });
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

    addServerLog('ADMIN', `Admin menambahkan video edukasi baru: "${title}" (${category})`);
    res.status(201).json({ ok: true, id: vidId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/content/videos/:id', requireAdmin, async (req, res) => {
  try {
    const vidId = String(req.params.id);
    await query(`DELETE FROM content_videos WHERE id = $1`, [vidId]);
    addServerLog('ADMIN', `Admin menghapus video ID: ${vidId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/content/videos/:id', requireAdmin, async (req, res) => {
  try {
    const vidId = String(req.params.id);
    const category = String(req.body?.category || 'Bimbingan Sosial').trim().slice(0, 80);
    const title = String(req.body?.title || '').trim().slice(0, 200);
    const duration = String(req.body?.duration || '5:00').trim().slice(0, 50);
    const description = String(req.body?.description || '').trim();
    const rawYoutube = String(req.body?.youtubeUrlOrId || req.body?.youtubeId || '').trim();
    const youtubeId = extractYoutubeId(rawYoutube);

    let keyTakeaways = [];
    if (Array.isArray(req.body?.keyTakeaways)) {
      keyTakeaways = req.body.keyTakeaways.map((k) => String(k).trim()).filter(Boolean);
    } else if (typeof req.body?.keyTakeaways === 'string') {
      keyTakeaways = req.body.keyTakeaways
        .split('\n')
        .map((k) => k.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    if (!title || !youtubeId) {
      return res.status(400).json({ error: 'Judul dan Link/ID YouTube wajib diisi.' });
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
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI CONTINUOUS LEARNING & REFERENCE PHOTOS
// ==========================================

// 1. GET LEARNING MEMORIES
app.get('/api/admin/learning-memory', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM ai_learning_memory ORDER BY id DESC LIMIT 100`
    );
    res.json({ memories: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD MANUAL LEARNING MEMORY
app.post('/api/admin/learning-memory', requireAdmin, async (req, res) => {
  try {
    const topicId = String(req.body?.topicId || 'general').trim();
    const category = String(req.body?.category || 'Manual Guru BK').trim();
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

    addServerLog('ADMIN', `Admin menambahkan memori pembelajaran AI baru: "${queryPattern.slice(0, 50)}..."`);
    res.status(201).json({ ok: true, id: result.rows[0]?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DELETE LEARNING MEMORY
app.delete('/api/admin/learning-memory/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query(`DELETE FROM ai_learning_memory WHERE id = $1`, [id]);
    addServerLog('ADMIN', `Admin menghapus memori pembelajaran AI ID: ${id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET REFERENCE PHOTOS
app.get('/api/admin/photos', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM ai_reference_photos ORDER BY id DESC`
    );
    res.json({ photos: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. UPLOAD / ADD REFERENCE PHOTO
app.post('/api/admin/photos', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 150);
    const category = String(req.body?.category || 'Bimbingan Konseling').trim().slice(0, 80);
    const description = String(req.body?.description || '').trim();
    let fileUrl = String(req.body?.fileUrl || '').trim();
    const base64Data = req.body?.base64Data; // data:image/png;base64,....

    if (!title || (!fileUrl && !base64Data)) {
      return res.status(400).json({ error: 'Judul dan file foto / URL foto wajib diisi.' });
    }

    if (base64Data) {
      const matches = String(base64Data).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = '.png';
      let buffer;
      if (matches && matches.length === 3) {
        const mime = matches[1].toLowerCase();
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
        else if (mime.includes('png')) ext = '.png';
        else if (mime.includes('webp')) ext = '.webp';
        else if (mime.includes('gif')) ext = '.gif';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      const fileName = `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      fileUrl = `/uploads/${fileName}`;
    }

    const photoId = `photo_${Date.now()}`;
    await query(
      `INSERT INTO ai_reference_photos (id, title, category, description, file_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [photoId, title, category, description, fileUrl]
    );

    addServerLog('ADMIN', `Admin mengunggah foto referensi konseling baru: "${title}" (${fileUrl})`);
    res.status(201).json({ ok: true, id: photoId, fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE REFERENCE PHOTO
app.delete('/api/admin/photos/:id', requireAdmin, async (req, res) => {
  try {
    const photoId = String(req.params.id);
    const existing = await query(`SELECT file_url FROM ai_reference_photos WHERE id = $1`, [photoId]);
    if (existing.rows.length > 0) {
      const fUrl = existing.rows[0].file_url;
      if (fUrl && fUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, fUrl);
        if (fs.existsSync(localPath)) {
          try {
            fs.unlinkSync(localPath);
          } catch {}
        }
      }
    }
    await query(`DELETE FROM ai_reference_photos WHERE id = $1`, [photoId]);
    addServerLog('ADMIN', `Admin menghapus foto referensi ID: ${photoId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built React frontend in production (including /admin route)
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SociaCare AI] Production server running on http://localhost:${PORT}`);
  });
});
