const https = require('https');
const dns = require('dns');
const { TOPICS, REFLECTION_CLOSING } = require('./counselorData');

dns.setDefaultResultOrder('ipv4first');

const ipv4Agent = new https.Agent({
  keepAlive: true,
  family: 4,
});

function postJsonIPv4(urlString, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlString);
    const bodyString = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        family: 4,
        agent: ipv4Agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyString),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: raw,
          });
        });
      }
    );

    req.setTimeout(20000, () => {
      req.destroy(new Error('Request timeout connecting to Gemini API'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(bodyString);
    req.end();
  });
}

const DEFAULT_SYSTEM_PERSONA = `Kamu adalah "SociaCare AI", konselor sebaya dan asisten Bimbingan Konseling (BK) yang hangat, cerdas, empatik, dan suportif bagi pelajar maupun mahasiswa. Gunakan bahasa Indonesia yang ramah dan akrab (gunakan sapaan "Aku" dan "kamu", serta sesekali sebut nama "{nama}").`;

const EMERGENCY_PATTERNS = [
  /bunuh\s*diri/i,
  /ingin\s*mati/i,
  /mau\s*mati/i,
  /pengen\s*mati/i,
  /akhiri\s*hidup/i,
  /mengakhiri\s*hidup/i,
  /enggak\s*kuat\s*hidup/i,
  /gak\s*kuat\s*hidup/i,
  /ga\s*kuat\s*hidup/i,
  /tidak\s*ingin\s*hidup/i,
  /percuma\s*hidup/i,
  /capek\s*hidup/i,
  /lelah\s*hidup/i,
  /nyakitin\s*diri/i,
  /menyakiti\s*diri/i,
  /lukai\s*diri/i,
  /melukai\s*diri/i,
  /self\s*harm/i,
  /suicide/i,
  /silet\s*tangan/i,
  /sayat\s*tangan/i,
  /gantung\s*diri/i,
  /lompat\s*dari/i,
  /overdosis/i,
  /minum\s*racun/i,
  /diancam\s*bunuh/i,
  /diancam\s*dibunuh/i,
  /dipukuli\s*sampai/i,
  /dianiaya/i,
  /kekerasan\s*seksual/i,
  /dilecehkan\s*secara/i,
  /depresi\s*berat/i,
  /putus\s*asa\s*banget/i,
];

function detectSevereEmergencyKeywords(text) {
  const raw = String(text || '');
  return EMERGENCY_PATTERNS.some((regex) => regex.test(raw));
}

const CLOSING_PATTERNS = [
  /^tidak,?\s*cukup$/i,
  /^cukup\s*sekian/i,
  /^sudah\s*cukup/i,
  /tutup\s*pembicaraan/i,
  /akhiri\s*pembicaraan/i,
  /akhiri\s*sesi/i,
  /akhiri\s*konseling/i,
  /tutup\s*sesi/i,
  /tutup\s*konseling/i,
  /selesai\s*konseling/i,
  /cukup\s*sampai\s*di\s*sini/i,
  /terima\s*kasih.*cukup/i,
  /makasih.*udah\s*cukup/i,
];

function detectClosingIntent(text) {
  const raw = String(text || '').trim();
  return CLOSING_PATTERNS.some((regex) => regex.test(raw));
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const BACKOFF_DELAYS = [2000, 4000, 8000]; // Jeda 2 detik, 4 detik, 8 detik (Exponential Backoff)

function getModelFallbackChain() {
  const primaryModel = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const fallbacksEnv = (process.env.GEMINI_FALLBACK_MODELS || '').trim();

  let chain = [primaryModel];
  if (fallbacksEnv) {
    const list = fallbacksEnv.split(',').map((m) => m.trim()).filter(Boolean);
    chain.push(...list);
  } else {
    // Default fallback chain jika tidak diatur di .env
    const defaults = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    chain.push(...defaults);
  }

  // Hilangkan duplikasi dengan tetap menjaga urutan
  return Array.from(new Set(chain.filter(Boolean)));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'econnreset' ||
    code === 'etimedout' ||
    code === 'enotfound' ||
    code === 'eai_again' ||
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset')
  );
}

/**
 * Generates a fast, real-time SociaCare AI counselor response powered by Google Gemini,
 * returning both the structured reply (including AI emergency detection & AI conversation closing) and token usage metadata.
 */
async function generateCounselorResponse({
  topicId,
  userName,
  userMessage,
  conversationHistory,
  currentStage,
  customSystemPersona,
}) {
  const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[0];
  const isClosingRequested = detectClosingIntent(userMessage);

  let nextStage = 4;
  if (isClosingRequested) {
    nextStage = 9;
  } else if (currentStage <= 3 && conversationHistory.length <= 2) {
    nextStage = 3;
  } else if (currentStage === 3) {
    nextStage = 4;
  } else {
    nextStage = topic.screenNumber;
  }

  const keywordEmergency = !isClosingRequested && detectSevereEmergencyKeywords(userMessage);

  try {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi di server/.env');
    }

    const geminiResult = await callGeminiApi({
      apiKey,
      topic,
      userName,
      userMessage,
      conversationHistory,
      nextStage,
      customSystemPersona,
      keywordEmergency,
      isClosingRequested,
    });

    const finalIsClosing = Boolean(
      isClosingRequested || geminiResult.structured?.isClosing
    );

    return {
      ...geminiResult,
      nextStage: finalIsClosing ? 9 : nextStage === 3 ? 35 : nextStage,
    };
  } catch (err) {
    console.error(`[SociaCare AI Fallback] Error saat memproses Gemini: ${err.message}`);

    if (isClosingRequested) {
      return {
        content: REFLECTION_CLOSING.intro,
        structured: {
          checklist: [],
          tipBox: null,
          footerText: REFLECTION_CLOSING.footer,
          quickReplies: ['Selesai & Penutup 💙', 'Fitur Lainnya', 'Hubungi Guru BK'],
          isClosing: true,
          isEmergency: false,
          emergencyLevel: 'normal',
          emergencyReason: '',
          emergencyWarning: '',
        },
        nextStage: 9,
        usage: {
          modelName: 'local-closing-fallback',
          promptTokens: 0,
          completionTokens: 0,
          thoughtTokens: 0,
          totalTokens: 0,
          latencyMs: 0,
        },
      };
    }

    if (keywordEmergency) {
      return {
        content: `Halo ${userName || 'Teman'}, aku mendengar betapa beratnya beban yang kamu rasakan saat ini. Keselamatan dan hidupmu sangatlah berharga. Tolong jangan simpan beban ini sendirian. Aku ada di sini untuk mendampingimu, dan sangat penting bagimu untuk segera berbicara dengan Guru BK atau layanan bantuan darurat sekarang juga.`,
        structured: {
          checklist: [
            'Tarik napas perlahan dan letakkan benda berbahaya dari jangkauanmu.',
            'Cari orang terpercaya atau guru BK di sekitarmu sekarang juga.',
            'Hubungi hotline konseling darurat 119 ext 8 jika membutuhkan bantuan segera.',
          ],
          tipBox: {
            title: 'Pesan Keselamatan:',
            text: 'Kamu tidak sendirian. Ada orang-orang yang peduli dan siap membantumu melewati saat-saat paling sulit ini.',
          },
          footerText: 'Maukah kamu menghubungi Guru BK atau orang terdekatmu sekarang?',
          quickReplies: ['Hubungi Guru BK', 'Aku akan mencari tempat aman', 'Tolong temani aku'],
          isClosing: false,
          isEmergency: true,
          emergencyLevel: 'critical',
          emergencyReason: `Terdeteksi indikasi krisis darurat dari kata kunci: "${String(userMessage || '').slice(0, 100)}"`,
          emergencyWarning: `PERINGATAN DARURAT: Halo ${userName || 'Teman'}, sistem mendeteksi kamu sedang dalam situasi krisis yang sangat membahayakan keselamatan. Tolong segera temui Guru BK atau hubungi hotline 119 ext 8.`,
        },
        nextStage: 4,
        usage: {
          modelName: 'local-emergency-fallback',
          promptTokens: 0,
          completionTokens: 0,
          thoughtTokens: 0,
          totalTokens: 0,
          latencyMs: 0,
        },
      };
    }

    // Safe fallback jika semua model Gemini gagal / timeout / transient error tak terselesaikan
    const topicSolutions = topic.generalSolution || {};
    return {
      content: `Halo ${userName || 'Teman'}, terima kasih sudah berbagi cerita dengan jujur. Aku sangat mengapresiasi keberanianmu mengekspresikan apa yang kamu rasakan tentang "${topic.title}". Meskipun jaringan sedang dalam penyesuaian otomatis, aku ingin kamu tahu bahwa perasaanmu valid dan kamu tidak sendirian.`,
      structured: {
        checklist: Array.isArray(topicSolutions.checklist) && topicSolutions.checklist.length > 0
          ? topicSolutions.checklist
          : [
              'Tarik napas perlahan dan tenangkan pikiran sejenak.',
              'Identifikasi hal kecil yang paling bisa kamu kendalikan hari ini.',
              'Diskusikan dengan teman terpercaya atau Guru BK jika terasa semakin berat.',
            ],
        tipBox: topic.topicSpecificSolution?.tipBox || {
          title: 'Tips Pendukung:',
          text: 'Setiap proses butuh waktu. Yang terpenting kamu tidak memendam masalah ini sendirian.',
        },
        footerText: 'Bagaimana perasaanmu sekarang? Apakah ingin melanjutkan bercerita atau menghubungi Guru BK?',
        quickReplies: ['Ceritakan lebih detail', 'Hubungi Guru BK', 'Tutup Pembicaraan'],
        isClosing: false,
        isEmergency: false,
        emergencyLevel: 'normal',
        emergencyReason: '',
        emergencyWarning: '',
      },
      nextStage: nextStage === 3 ? 35 : nextStage,
      usage: {
        modelName: 'local-counselor-fallback',
        promptTokens: 0,
        completionTokens: 0,
        thoughtTokens: 0,
        totalTokens: 0,
        latencyMs: 0,
      },
    };
  }
}

async function callGeminiApi({
  apiKey,
  topic,
  userName,
  userMessage,
  conversationHistory,
  nextStage,
  customSystemPersona,
  keywordEmergency,
  isClosingRequested,
}) {
  const stageGuidance = isClosingRequested
    ? `PENGGUNA MEMILIH UNTUK MENUTUP / MENGAKHIRI PEMBICARAAN KONSELING.
Berikan pesan penutup konseling yang sangat hangat, mengapresiasi keberanian "${userName || 'Teman'}" karena sudah berbagi cerita hari ini, rangkum singkat penguatan positif dari obrolan sebelumnya, dan sampaikan bahwa pintu SociaCare AI selalu terbuka kapan pun ia ingin bercerita lagi.
Wajib set "isClosing": true, biarkan "checklist": [] dan "tipBox": null, isi "footerText" dengan kalimat perpisahan yang menenangkan (misal: "Kamu hebat sudah berani bercerita hari ini. Sampai jumpa lagi ya! 💙"), dan isi "quickReplies" dengan ["Selesai & Penutup 💙", "Fitur Lainnya", "Hubungi Guru BK"].`
    : nextStage === 3
    ? `Pengguna baru mulai bercerita. Dengarkan dengan penuh empati, tanggapi isi pesan secara spesifik dan natural, lalu ajukan 1 pertanyaan lembut untuk menggali cerita/perasaan mereka lebih dalam. Untuk tahap awal ini, biarkan "checklist" berupa array kosong [] dan "tipBox" bernilai null.`
    : nextStage === 4
    ? `Berikan respons empatik yang menjawab langsung cerita pengguna, lalu berikan 3-4 langkah solusi konkrit yang relevan dengan masalah mereka di dalam array "checklist". Sertakan pertanyaan reflektif singkat di "footerText" (misalnya menanyakan langkah mana yang paling nyaman dicoba).`
    : `Jawab langsung pertanyaan atau tanggapan terbaru pengguna secara kontekstual dan mendalam sesuai topik "${topic.title}". Jika relevan, berikan poin-poin langkah/contoh di "checklist" dan berikan 1 tips praktis di dalam "tipBox" ({"title": "Tips Tambahan:", "text": "..."}). Di "footerText", tanyakan apakah masih ada hal lain yang ingin diceritakan atau apakah pengguna ingin menutup pembicaraan.`;

  const basePersona = (customSystemPersona || DEFAULT_SYSTEM_PERSONA)
    .replace(/\{nama\}/gi, userName || 'Teman')
    .replace(/\{kelas\}/gi, '')
    .replace(/\{topik\}/gi, topic.title);

  const systemPrompt = `${basePersona}
Topik konseling yang dipilih: "${topic.title}".
Nama: "${userName}".

Panduan Respons Saat Ini:
${stageGuidance}

DETEKSI KONDISI GAWAT DARURAT / SANGAT PARAH (PENTING!):
Analisis apakah pesan pengguna menunjukkan kondisi DARURAT / SANGAT PARAH, seperti:
- Keinginan bunuh diri, mengakhiri hidup, atau berharap mati
- Menyakiti diri sendiri (self-harm) atau percobaan melukai fisik sendiri
- Mengalami kekerasan fisik berat, ancaman nyawa, perundungan ekstrem yang membahayakan keselamatan, atau pelecehan/kekerasan seksual
- Keputusasaan ekstrem / depresi berat yang membahayakan keselamatan jiwa pengguna

Jika terdeteksi kondisi darurat/sangat parah (atau jika indikator keyword darurat = ${keywordEmergency ? 'YA, WAJIB SET isEmergency: true' : 'Evaluasi dari isi pesan'}):
1. Set "isEmergency": true dan "emergencyLevel": "critical".
2. Isi "emergencyWarning" dengan pesan peringatan darurat berbasis AI yang tegas namun penuh kepedulian untuk pengguna (mengingatkan bahwa nyawa dan keselamatan mereka sangat berharga, meminta mereka menarik napas dan tidak melakukan tindakan berbahaya, serta segera menghubungi Konselor/Guru BK atau layanan darurat 119 ext 8).
3. Isi "emergencyReason" dengan ringkasan singkat dan jelas untuk Admin/Konselor mengenai alasan pengguna masuk status gawat darurat.
4. Di "checklist", berikan langkah penyelamatan diri darurat saat ini (misal: menjauh dari benda berbahaya, menemui orang dewasa/teman terpercaya di dekatnya, menghubungi konselor).
Jika kondisi pengguna normal/masalah sosial biasa (bukan krisis keselamatan jiwa), set "isEmergency": false, "emergencyLevel": "normal", "emergencyReason": "", dan "emergencyWarning": "".

DETEKSI PENUTUPAN PEMBICARAAN:
Jika pengguna menyatakan sudah cukup bercerita, ingin mengakhiri/menutup sesi pembicaraan, atau berpamitan (atau jika isClosingRequested = ${isClosingRequested ? 'true' : 'false'}), set "isClosing": true dan berikan kalimat penutup konseling yang hangat serta suportif. Jika pembicaraan masih berlangsung, set "isClosing": false dan sertakan opsi "Tutup Pembicaraan" atau "Tidak, cukup" di dalam "quickReplies".

Kembalikan respons HANYA dalam format JSON valid (tanpa markdown code block) dengan struktur berikut:
{
  "intro": "Tanggapan utama kamu yang menjawab langsung pesan secara empatik dan natural",
  "checklist": ["Poin langkah/contoh 1", "Poin langkah/contoh 2"],
  "tipBox": { "title": "Tips Tambahan:", "text": "Tips praktis singkat yang relevan" } atau null,
  "footerText": "Pertanyaan lanjutan atau kalimat penutup yang hangat",
  "quickReplies": ["Balasan singkat relevan 1", "Masih ada", "Tutup Pembicaraan"],
  "isClosing": false,
  "isEmergency": false,
  "emergencyLevel": "normal",
  "emergencyReason": "",
  "emergencyWarning": ""
}`;

  const contents = [
    ...conversationHistory.slice(-10).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  const modelChain = getModelFallbackChain();
  let lastError = null;

  for (let mIdx = 0; mIdx < modelChain.length; mIdx++) {
    const modelName = modelChain[mIdx];
    const nextModel = modelChain[mIdx + 1];

    for (let attempt = 1; attempt <= BACKOFF_DELAYS.length; attempt++) {
      const t0 = Date.now();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      try {
        const res = await postJsonIPv4(url, {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        });

        const latencyMs = Date.now() - t0;

        if (!res.ok) {
          const isTransient = RETRYABLE_STATUS_CODES.has(res.status);
          const errorMsg = `Gemini API (${modelName}) HTTP ${res.status}: ${res.text}`;
          lastError = new Error(errorMsg);

          if (isTransient && attempt < BACKOFF_DELAYS.length) {
            const delay = BACKOFF_DELAYS[attempt - 1];
            console.warn(
              `[SociaCare AI Backoff] HTTP ${res.status} pada ${modelName} (Percobaan ${attempt}/${BACKOFF_DELAYS.length}). Menunggu jeda ${delay / 1000}s sebelum retry otomatis...`
            );
            await sleep(delay);
            continue;
          }

          console.warn(
            `[SociaCare AI Fallback] Model ${modelName} gagal setelah ${attempt} percobaan (HTTP ${res.status}). ${
              nextModel ? `Mengalihkan request ke model alternatif ${nextModel}...` : 'Tidak ada model alternatif tersisa.'
            }`
          );
          break; // Keluar dari loop retry attempt, beralih ke model fallback berikutnya
        }

        const data = JSON.parse(res.text);
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const textPart =
          [...parts].reverse().find((p) => typeof p.text === 'string' && !p.thought) ||
          parts.find((p) => typeof p.text === 'string');

        if (!textPart || !textPart.text) {
          lastError = new Error(`Format respons model ${modelName} tidak berisi teks valid.`);
          console.warn(`[SociaCare AI Fallback] ${lastError.message}. Beralih ke model alternatif...`);
          break;
        }

        const usageMeta = data?.usageMetadata || {};
        const promptTokens = Number(usageMeta.promptTokenCount || 0);
        const completionTokens = Number(usageMeta.candidatesTokenCount || 0);
        const thoughtTokens = Number(usageMeta.thoughtsTokenCount || 0);
        const totalTokens = Number(
          usageMeta.totalTokenCount || promptTokens + completionTokens + thoughtTokens
        );

        const cleaned = textPart.text
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/, '');

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = {
            intro: textPart.text.trim(),
            checklist: [],
            tipBox: null,
            footerText: '',
            quickReplies: ['Masih ada', 'Tidak, cukup'],
          };
        }

        const isClosingDetected = Boolean(
          isClosingRequested || parsed.isClosing
        );

        const isEmergencyDetected =
          !isClosingDetected &&
          Boolean(
            parsed.isEmergency ||
              parsed.emergencyLevel === 'critical' ||
              keywordEmergency
          );

        const emergencyWarningText = isEmergencyDetected
          ? parsed.emergencyWarning ||
            `PERINGATAN DARURAT AI: Halo ${
              userName || 'Teman'
            }, sistem SociaCare AI mendeteksi kamu sedang berada dalam kondisi yang sangat berat dan darurat. Keselamatan dan nyawamu sangatlah berharga. Mohon jangan hadapi ini sendirian dan segera hubungi Konselor / Guru BK atau layanan darurat 119 ext 8.`
          : '';

        const emergencyReasonText = isEmergencyDetected
          ? parsed.emergencyReason ||
            `Terdeteksi indikasi krisis darurat / kondisi sangat parah dari pesan pengguna: "${String(
              userMessage || ''
            ).slice(0, 120)}"`
          : '';

        const defaultQuickReplies = isClosingDetected
          ? ['Selesai & Penutup 💙', 'Pilih Topik Baru', 'Fitur Lainnya']
          : isEmergencyDetected
          ? [
              '🚨 Hubungi Guru BK',
              'Aku butuh ditemani sekarang',
              'Aku akan mencari tempat aman',
            ]
          : ['Masih ada', 'Tutup Pembicaraan'];

        return {
          content: parsed.intro || textPart.text.trim(),
          structured: {
            checklist: isClosingDetected
              ? []
              : Array.isArray(parsed.checklist)
              ? parsed.checklist
              : [],
            tipBox:
              !isClosingDetected && parsed.tipBox && parsed.tipBox.text
                ? parsed.tipBox
                : null,
            footerText: parsed.footerText || '',
            quickReplies: isClosingDetected
              ? ['Selesai & Penutup 💙', 'Pilih Topik Baru', 'Fitur Lainnya']
              : isEmergencyDetected
              ? [
                  'Hubungi Guru BK',
                  ...(Array.isArray(parsed.quickReplies)
                    ? parsed.quickReplies.filter((q) => q !== 'Hubungi Guru BK').slice(0, 2)
                    : ['Aku butuh ditemani sekarang']),
                ]
              : Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0
              ? parsed.quickReplies
              : defaultQuickReplies,
            isClosing: isClosingDetected,
            isEmergency: isEmergencyDetected,
            emergencyLevel: isEmergencyDetected ? 'critical' : 'normal',
            emergencyWarning: emergencyWarningText,
            emergencyReason: emergencyReasonText,
          },
          usage: {
            modelName: data?.modelVersion || modelName,
            promptTokens,
            completionTokens,
            thoughtTokens,
            totalTokens,
            latencyMs,
          },
        };
      } catch (err) {
        lastError = err;
        const isTransient = isTransientNetworkError(err);

        if (isTransient && attempt < BACKOFF_DELAYS.length) {
          const delay = BACKOFF_DELAYS[attempt - 1];
          console.warn(
            `[SociaCare AI Backoff] Gangguan jaringan (${err.message}) pada ${modelName} (Percobaan ${attempt}/${BACKOFF_DELAYS.length}). Menunggu jeda ${delay / 1000}s sebelum retry otomatis...`
          );
          await sleep(delay);
          continue;
        }

        console.warn(
          `[SociaCare AI Fallback] Model ${modelName} gagal: ${err.message}. ${
            nextModel ? `Mengalihkan request ke model alternatif ${nextModel}...` : 'Tidak ada model alternatif tersisa.'
          }`
        );
        break; // Lanjut ke model fallback berikutnya
      }
    }
  }

  throw lastError || new Error('Gagal mendapatkan respons dari seluruh model Gemini API.');
}

module.exports = {
  generateCounselorResponse,
  DEFAULT_SYSTEM_PERSONA,
  getModelFallbackChain,
};
