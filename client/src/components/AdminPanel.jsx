import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SociaHeartLogo, StudentAvatar } from './Illustrations';
import {
  Server,
  Users,
  Database,
  Terminal,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Download,
  Trash2,
  Edit3,
  Eye,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  HardDrive,
  Activity,
  KeyRound,
  LogOut,
  Play,
  ArrowLeft,
  Search,
  X,
  Headphones,
  Sparkles,
  Zap,
  RotateCcw,
  Save,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds) {
  const s = Number(seconds || 0);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h} jam ${m} mnt ${sec} dtk`;
  return `${m} mnt ${sec} dtk`;
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('id-ID');
}

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem('sociacare_admin_token') || ''
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tab: 'server' | 'ai_config' | 'users' | 'counseling' | 'sql'
  const [activeTab, setActiveTab] = useState('server');
  const [bannerMsg, setBannerMsg] = useState(null);

  // Server & DB Stats State (includes tokenUsage)
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState(null);
  const [testingGemini, setTestingGemini] = useState(false);

  // AI Opening Format & Persona Settings State
  const [aiSettings, setAiSettings] = useState({
    openingMode: 'global',
    globalGreeting:
      'Terima kasih sudah memilih topik ini. Boleh ceritakan lebih detail, apa yang sedang kamu alami?',
    topicGreetings: {
      friendship: '',
      communication: '',
      confidence: '',
      bullying: '',
    },
    openingFooter: '',
    openingQuickRepliesText: '',
    systemPersona: '',
  });
  const [defaultAiSettings, setDefaultAiSettings] = useState(null);
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [previewTopic, setPreviewTopic] = useState('friendship');

  // Server Config Form State
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [newAdminPwd, setNewAdminPwd] = useState('');

  // Users CRUD State
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    avatarStyle: 'student-female',
  });
  const [editingUser, setEditingUser] = useState(null);
  const [inspectedUserDetail, setInspectedUserDetail] = useState(null);

  // Counseling & Guru BK State
  const [allSessions, setAllSessions] = useState([]);
  const [allBkRequests, setAllBkRequests] = useState([]);
  const [editingBk, setEditingBk] = useState(null);

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState(
    'SELECT id, name, avatar_style, created_at, last_active_at FROM users ORDER BY id DESC;'
  );
  const [sqlResult, setSqlResult] = useState(null);
  const [runningSql, setRunningSql] = useState(false);

  function showNotification(type, text) {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 4500);
  }

  function adminHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    };
  }

  useEffect(() => {
    if (adminToken) {
      loadServerStats();
      loadAiSettings();
      loadUsers();
      loadCounselingData();
    }
  }, [adminToken]);

  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Login gagal.');
        return;
      }
      localStorage.setItem('sociacare_admin_token', data.token);
      setAdminToken(data.token);
      setPasswordInput('');
    } catch {
      setLoginError('Gagal menghubungi server.');
    }
  }

  function handleAdminLogout() {
    localStorage.removeItem('sociacare_admin_token');
    setAdminToken('');
    setStats(null);
  }

  async function loadServerStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/server-stats', {
        headers: adminHeaders(),
      });
      if (res.status === 401) {
        handleAdminLogout();
        return;
      }
      const data = await res.json();
      if (data.server) setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadAiSettings() {
    try {
      const res = await fetch('/api/admin/ai-settings', {
        headers: adminHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) {
        setAiSettings({
          ...data.settings,
          openingQuickRepliesText: Array.isArray(
            data.settings.openingQuickReplies
          )
            ? data.settings.openingQuickReplies.join('\n')
            : '',
        });
      }
      if (data.defaults) {
        setDefaultAiSettings(data.defaults);
      }
    } catch (err) {
      console.error('Error loading AI settings:', err);
    }
  }

  async function handleSaveAiSettings(e) {
    if (e) e.preventDefault();
    setSavingAiSettings(true);
    try {
      const quickRepliesArray = String(aiSettings.openingQuickRepliesText || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        openingMode: aiSettings.openingMode,
        globalGreeting: aiSettings.globalGreeting,
        topicGreetings: aiSettings.topicGreetings,
        openingFooter: aiSettings.openingFooter,
        openingQuickReplies: quickRepliesArray,
        systemPersona: aiSettings.systemPersona,
      };

      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showNotification(
          'success',
          'Format pembuka AI & persona konselor berhasil disimpan!'
        );
      } else {
        showNotification('error', data.error || 'Gagal menyimpan format AI.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setSavingAiSettings(false);
    }
  }

  function handleResetAiSettingsToDefault() {
    if (!defaultAiSettings) return;
    if (
      !window.confirm(
        'Kembalikan format pembuka AI dan persona konselor ke pengaturan bawaan?'
      )
    ) {
      return;
    }
    setAiSettings({
      ...defaultAiSettings,
      openingQuickRepliesText: Array.isArray(
        defaultAiSettings.openingQuickReplies
      )
        ? defaultAiSettings.openingQuickReplies.join('\n')
        : '',
    });
    showNotification(
      'success',
      'Format dikembalikan ke bawaan. Klik "Simpan Pengaturan AI" untuk menerapkan.'
    );
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', { headers: adminHeaders() });
      if (res.status === 401) return handleAdminLogout();
      const data = await res.json();
      if (data.users) setUsersList(data.users);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }

  async function loadCounselingData() {
    try {
      const [sessRes, bkRes] = await Promise.all([
        fetch('/api/admin/sessions', { headers: adminHeaders() }),
        fetch('/api/admin/counselor-requests', { headers: adminHeaders() }),
      ]);
      const sessData = await sessRes.json();
      const bkData = await bkRes.json();
      if (sessData.sessions) setAllSessions(sessData.sessions);
      if (bkData.requests) setAllBkRequests(bkData.requests);
    } catch (err) {
      console.error('Error loading counseling data:', err);
    }
  }

  async function handleTestGeminiConnection() {
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch('/api/admin/test-gemini', {
        method: 'POST',
        headers: adminHeaders(),
      });
      const data = await res.json();
      setGeminiTestResult(data);
      loadServerStats();
    } catch (err) {
      setGeminiTestResult({ ok: false, error: err.message });
    } finally {
      setTestingGemini(false);
    }
  }

  async function handleSaveServerConfig(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          geminiApiKey: newGeminiKey,
          newAdminPassword: newAdminPwd,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.newToken) {
          localStorage.setItem('sociacare_admin_token', data.newToken);
          setAdminToken(data.newToken);
        }
        setNewGeminiKey('');
        setNewAdminPwd('');
        showNotification('success', 'Konfigurasi server (.env) berhasil diperbarui!');
        loadServerStats();
      } else {
        showNotification('error', data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDbMaintenance(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      const res = await fetch('/api/admin/db-maintenance', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', data.message);
        loadServerStats();
        loadUsers();
        loadCounselingData();
      } else {
        showNotification('error', data.error);
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleExportDatabase() {
    try {
      const res = await fetch('/api/admin/export', { headers: adminHeaders() });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sociacare-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Backup database berhasil diunduh.');
      loadServerStats();
    } catch {
      showNotification('error', 'Gagal mengunduh backup database.');
    }
  }

  // User CRUD Handlers
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserForm.name.trim()) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newUserForm),
      });
      if (res.ok) {
        setNewUserForm({ name: '', avatarStyle: 'student-female' });
        showNotification('success', 'User baru berhasil ditambahkan ke database SQL.');
        loadUsers();
        loadServerStats();
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          name: editingUser.name,
          avatarStyle: editingUser.avatar_style,
        }),
      });
      if (res.ok) {
        setEditingUser(null);
        showNotification('success', 'Data user berhasil diperbarui.');
        loadUsers();
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteUser(user) {
    if (
      !window.confirm(
        `Hapus user "${user.name}" beserta seluruh sesi chat dan tiket BK miliknya?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        if (inspectedUserDetail?.user?.id === user.id) {
          setInspectedUserDetail(null);
        }
        showNotification('success', `User ${user.name} berhasil dihapus dari database.`);
        loadUsers();
        loadServerStats();
        loadCounselingData();
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleInspectUser(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/detail`, {
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (data.user) {
        setInspectedUserDetail(data);
      }
    } catch {
      showNotification('error', 'Gagal memuat detail user.');
    }
  }

  async function handleToggleUserEmergency(user, makeEmergency) {
    const confirmMsg = makeEmergency
      ? `Tandai user "${user.name}" dalam kondisi GAWAT DARURAT? (Tema layar user akan berubah menjadi merah darurat)`
      : `Selesaikan / cabut status Gawat Darurat untuk user "${user.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/emergency`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          isEmergency: makeEmergency,
          reason: makeEmergency
            ? 'Ditandai langsung sebagai kondisi darurat oleh Admin / Konselor BK.'
            : '',
        }),
      });
      if (res.ok) {
        showNotification(
          'success',
          makeEmergency
            ? `Status GAWAT DARURAT diaktifkan untuk ${user.name}.`
            : `Status darurat ${user.name} telah diselesaikan (kembali normal).`
        );
        loadUsers();
        loadServerStats();
        loadCounselingData();
        if (inspectedUserDetail?.user?.id === user.id) {
          handleInspectUser(user.id);
        }
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleSaveBkUpdate(e) {
    e.preventDefault();
    if (!editingBk) return;
    try {
      const res = await fetch(`/api/admin/counselor-requests/${editingBk.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          status: editingBk.status,
          counselorReply: editingBk.counselor_reply,
        }),
      });
      if (res.ok) {
        setEditingBk(null);
        showNotification('success', 'Status & balasan Guru BK berhasil disimpan.');
        loadCounselingData();
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteBk(id) {
    if (!window.confirm('Hapus tiket pengajuan Guru BK ini?')) return;
    await fetch(`/api/admin/counselor-requests/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    loadCounselingData();
    loadServerStats();
  }

  async function handleDeleteSessionAdmin(sessionId) {
    if (!window.confirm('Hapus sesi konseling ini beserta seluruh pesannya?')) return;
    await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    loadCounselingData();
    loadUsers();
    loadServerStats();
    if (inspectedUserDetail) {
      handleInspectUser(inspectedUserDetail.user.id);
    }
  }

  async function handleRunSql(customSql = null) {
    const queryToRun = customSql !== null ? customSql : sqlQuery;
    if (!queryToRun.trim()) return;
    if (customSql !== null) setSqlQuery(customSql);

    setRunningSql(true);
    try {
      const res = await fetch('/api/admin/sql', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ sql: queryToRun }),
      });
      const data = await res.json();
      setSqlResult(data);
      loadServerStats();
      loadUsers();
    } catch (err) {
      setSqlResult({ ok: false, error: err.message });
    } finally {
      setRunningSql(false);
    }
  }

  const filteredUsers = usersList.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  const topicLabels = {
    friendship: 'Hubungan Pertemanan yang Tidak Sehat',
    communication: 'Komunikasi Efektif',
    confidence: 'Kepercayaan Diri',
    bullying: 'Mencegah Bullying',
  };

  function renderPreviewGreeting() {
    const raw =
      aiSettings.openingMode === 'per_topic' &&
      aiSettings.topicGreetings?.[previewTopic]
        ? aiSettings.topicGreetings[previewTopic]
        : aiSettings.globalGreeting;
    return String(raw || '')
      .replace(/\{nama\}/gi, 'Alya Putri')
      .replace(/\{kelas\}/gi, '')
      .replace(/\{topik\}/gi, topicLabels[previewTopic]);
  }

  function renderPreviewFooter() {
    return String(aiSettings.openingFooter || '')
      .replace(/\{nama\}/gi, 'Alya Putri')
      .replace(/\{kelas\}/gi, '')
      .replace(/\{topik\}/gi, topicLabels[previewTopic]);
  }

  // =========================================================================
  // ADMIN LOGIN GATE
  // =========================================================================
  if (!adminToken) {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#0F294A] via-[#163A5F] to-[#1E5FA8] flex items-center justify-center p-5 text-white">
        <div className="w-full max-w-md bg-white text-[#1E2F47] rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SociaHeartLogo size={40} />
              <div>
                <h1 className="font-extrabold text-xl text-[#163A5F]">
                  SociaCare Admin
                </h1>
                <p className="text-xs text-[#4A6382]">
                  Panel Pengolahan Server, AI & Database User
                </p>
              </div>
            </div>
            <ShieldCheck size={28} className="text-[#1E5FA8]" />
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                Password Administrator
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan ADMIN_PASSWORD (default: admin123)"
                className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-4 py-3 text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-sm py-3.5 rounded-full shadow-lg transition cursor-pointer"
            >
              Masuk ke Panel Admin
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E5FA8] hover:underline"
            >
              <ArrowLeft size={14} />
              Kembali ke Aplikasi Siswa
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const osMemUsed =
    (stats?.server?.memory?.osTotal || 0) - (stats?.server?.memory?.osFree || 0);
  const osMemPercent = stats?.server?.memory?.osTotal
    ? Math.round((osMemUsed / stats.server.memory.osTotal) * 100)
    : 0;

  const tokenSummary = stats?.tokenUsage?.summary || {
    totalRequests: 0,
    promptTokens: 0,
    completionTokens: 0,
    thoughtTokens: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
  };

  const emergencyUsers =
    stats?.emergency?.emergencyUsers ||
    usersList.filter((u) => Number(u.is_emergency) === 1);
  const emergencyUsersCount = emergencyUsers.length;

  return (
    <div className="min-h-[100dvh] w-full bg-[#F0F6FC] text-[#1E2F47] flex flex-col lg:flex-row">
      {/* =====================================================================
          LEFT NAVIGATION SIDEBAR (ADMIN)
         ===================================================================== */}
      <aside className="w-full lg:w-72 bg-[#102A45] text-white flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SociaHeartLogo size={36} />
              <div>
                <div className="font-extrabold text-base tracking-tight">
                  SociaCare Admin
                </div>
                <div className="text-[11px] text-sky-300 font-medium">
                  Server, AI & Database Control
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={loadServerStats}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 transition cursor-pointer"
              title="Refresh Data Server"
            >
              <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
            </button>
          </div>

          <nav className="p-3 sm:p-4 flex lg:flex-col gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('server');
                loadServerStats();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'server'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Server size={18} />
              <span>Pengolahan Server & Token</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ai_config');
                loadAiSettings();
                loadServerStats();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'ai_config'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} />
                <span>Format Pembuka & AI</span>
              </div>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {formatNum(tokenSummary.totalTokens)} tok
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('users');
                loadUsers();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Database User</span>
              </div>
              <div className="flex items-center gap-1.5">
                {emergencyUsersCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    🚨 {emergencyUsersCount}
                  </span>
                )}
                <span className="bg-white/20 text-[11px] px-2 py-0.5 rounded-full">
                  {stats?.database?.tables?.users ?? usersList.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('counseling');
                loadCounselingData();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'counseling'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={18} />
                <span>Sesi Chat & Guru BK</span>
              </div>
              <span className="bg-white/20 text-[11px] px-2 py-0.5 rounded-full">
                {stats?.database?.tables?.chat_sessions ?? allSessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sql');
                if (!sqlResult) {
                  handleRunSql(
                    'SELECT id, name, avatar_style, created_at, last_active_at FROM users ORDER BY id DESC;'
                  );
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'sql'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Terminal size={18} />
              <span>SQL Query Console</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 flex lg:flex-col gap-2 justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-bold text-sky-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition"
          >
            <ArrowLeft size={15} />
            <span>Buka Halaman Siswa</span>
          </Link>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="flex items-center gap-2 text-xs font-bold text-red-300 hover:text-red-200 px-3 py-2 rounded-xl hover:bg-red-500/20 transition cursor-pointer"
          >
            <LogOut size={15} />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN ADMIN CONTENT AREA
         ===================================================================== */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto space-y-6">
        {/* GLOBAL REAL-TIME EMERGENCY USERS ALERT BANNER FOR ADMIN */}
        {emergencyUsersCount > 0 && (
          <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-red-400 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white text-red-700 flex items-center justify-center shrink-0 animate-pulse shadow">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-300 text-red-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                      🚨 Deteksi Darurat AI
                    </span>
                    <h2 className="font-extrabold text-base sm:text-lg">
                      {emergencyUsersCount} Pengguna Sedang dalam Kondisi Gawat Darurat / Sangat Parah!
                    </h2>
                  </div>
                  <p className="text-xs text-red-100 mt-0.5">
                    Sistem AI mendeteksi indikasi krisis berat pada percakapan pengguna berikut dan telah mengaktifkan tema peringatan darurat merah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  loadUsers();
                }}
                className="bg-white hover:bg-red-50 text-red-800 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                Kelola di Database User →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {emergencyUsers.map((eu) => (
                <div
                  key={eu.id}
                  className="bg-red-950/60 border border-red-400/50 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>🚨 {eu.name}</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">
                        ID #{eu.id}
                      </span>
                    </div>
                    <p className="text-red-100 leading-snug">
                      <strong>Analisis AI:</strong>{' '}
                      {eu.emergency_reason || 'Terdeteksi kondisi darurat pada percakapan.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('users');
                        handleInspectUser(eu.id);
                      }}
                      className="bg-white text-red-800 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Inspeksi Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUserEmergency(eu, false)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bannerMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm ${
              bannerMsg.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMsg.type === 'error' ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>{bannerMsg.text}</span>
            </div>
            <button type="button" onClick={() => setBannerMsg(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ===================================================================
            TAB 1: PENGOLAHAN SERVER, MONITORING TOKEN AI & INFRASTRUKTUR DB
           =================================================================== */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                  Pengolahan Server, Token AI & Infrastruktur Database
                </h1>
                <p className="text-xs sm:text-sm text-[#4A6382]">
                  Pantau penggunaan token Gemini AI, resource server real-time, konfigurasi `.env`, dan pemeliharaan database SQL.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download size={16} />
                  <span>Backup Database (.JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={loadServerStats}
                  className="bg-white hover:bg-slate-50 border border-[#C5DDF6] text-[#163A5F] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw size={15} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* AI TOKEN USAGE SUMMARY BANNER CARDS */}
            <div className="bg-gradient-to-r from-[#102A45] via-[#163A5F] to-[#1E5FA8] text-white rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Zap size={22} className="text-amber-300" />
                  <div>
                    <h2 className="font-extrabold text-base sm:text-lg">
                      Monitoring Penggunaan Token Gemini AI (Real-Time SQL)
                    </h2>
                    <p className="text-xs text-sky-200">
                      Akumulasi pemakaian token dari seluruh percakapan konseling siswa
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai_config')}
                    className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    Ubah Format Pembuka AI →
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDbMaintenance(
                        'clear_token_logs',
                        'Reset seluruh catatan riwayat penggunaan token AI?'
                      )
                    }
                    className="bg-red-500/20 hover:bg-red-500/35 text-red-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Reset Token
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase text-sky-200">
                    Total Token Terpakai
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300 mt-1">
                    {formatNum(tokenSummary.totalTokens)}
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Dari {formatNum(tokenSummary.totalRequests)} panggilan AI
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase text-sky-200">
                    Prompt (Input) Tokens
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {formatNum(tokenSummary.promptTokens)}
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Konteks & pesan siswa
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase text-sky-200">
                    Completion (Output)
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-300 mt-1">
                    {formatNum(tokenSummary.completionTokens)}
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Balasan JSON konselor
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4">
                  <div className="text-[11px] font-bold uppercase text-sky-200">
                    Thinking Tokens
                  </div>
                  <div className="text-2xl font-extrabold text-purple-300 mt-1">
                    {formatNum(tokenSummary.thoughtTokens)}
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Penalaran internal model
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-bold uppercase text-sky-200">
                    Rata-Rata Kecepatan
                  </div>
                  <div className="text-2xl font-extrabold text-sky-300 mt-1">
                    {formatNum(tokenSummary.avgLatencyMs)} ms
                  </div>
                  <div className="text-[11px] text-sky-200 mt-0.5">
                    Waktu respons per pesan
                  </div>
                </div>
              </div>
            </div>

            {/* Top 4 Server & DB Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#4A6382]">
                  <span>STATUS SERVER & JARINGAN</span>
                  <Activity size={18} className="text-emerald-600" />
                </div>
                <div className="text-lg font-extrabold text-[#102A45]">
                  Online ({stats?.server?.bindAddress || '0.0.0.0'}:
                  {stats?.server?.port || 3001})
                </div>
                <div className="text-xs text-[#4A6382] space-y-0.5">
                  <div>
                    Uptime Server:{' '}
                    <strong className="text-[#163A5F]">
                      {formatUptime(stats?.server?.uptimeSeconds)}
                    </strong>
                  </div>
                  <div>
                    IP LAN:{' '}
                    <strong className="text-[#1E5FA8]">
                      {stats?.server?.lanIps?.join(', ') || '127.0.0.1'}
                    </strong>
                  </div>
                  <div>
                    Node.js: <strong>{stats?.server?.nodeVersion}</strong> (PID{' '}
                    {stats?.server?.pid})
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#4A6382]">
                  <span>PENGGUNAAN RAM & MEMORI</span>
                  <HardDrive size={18} className="text-[#1E5FA8]" />
                </div>
                <div className="text-lg font-extrabold text-[#102A45]">
                  {formatBytes(stats?.server?.memory?.rss)} (Node RSS)
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#1E5FA8] h-full rounded-full"
                    style={{ width: `${Math.min(100, osMemPercent)}%` }}
                  />
                </div>
                <div className="text-xs text-[#4A6382] space-y-0.5">
                  <div>
                    Heap JS: {formatBytes(stats?.server?.memory?.heapUsed)} /{' '}
                    {formatBytes(stats?.server?.memory?.heapTotal)}
                  </div>
                  <div>
                    RAM OS: {formatBytes(osMemUsed)} /{' '}
                    {formatBytes(stats?.server?.memory?.osTotal)} ({osMemPercent}%)
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#4A6382]">
                  <span>PROSESOR & SISTEM OS</span>
                  <Cpu size={18} className="text-indigo-600" />
                </div>
                <div className="text-lg font-extrabold text-[#102A45]">
                  {stats?.server?.cpuCount || 1} Core CPU
                </div>
                <div className="text-xs text-[#4A6382] space-y-0.5">
                  <div className="truncate" title={stats?.server?.cpuModel}>
                    {stats?.server?.cpuModel}
                  </div>
                  <div>
                    Load Avg:{' '}
                    <strong>
                      {stats?.server?.loadAvg
                        ?.map((n) => n.toFixed(2))
                        .join(' / ')}
                    </strong>
                  </div>
                  <div className="truncate">{stats?.server?.platform}</div>
                </div>
              </div>

              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#4A6382]">
                  <span>MESIN DATABASE SQL</span>
                  <Database size={18} className="text-amber-600" />
                </div>
                <div className="text-lg font-extrabold text-[#102A45]">
                  {stats?.database?.engine === 'postgresql'
                    ? 'PostgreSQL'
                    : 'SQLite SQL Engine'}
                </div>
                <div className="text-xs text-[#4A6382] space-y-0.5">
                  <div>
                    Ukuran DB:{' '}
                    <strong>{formatBytes(stats?.database?.fileSizeBytes)}</strong>
                  </div>
                  <div>
                    Total User:{' '}
                    <strong>{stats?.database?.tables?.users || 0} siswa</strong> •{' '}
                    Sesi:{' '}
                    <strong>{stats?.database?.tables?.chat_sessions || 0}</strong>
                  </div>
                  <div>
                    Total Pesan Chat:{' '}
                    <strong>{stats?.database?.tables?.chat_messages || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Gemini AI Diagnostics & Server Config + DB Maintenance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#C5DDF6] rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <KeyRound size={20} className="text-[#1E5FA8]" />
                    <h2 className="font-extrabold text-base text-[#102A45]">
                      Konfigurasi Server & Koneksi Gemini AI (`.env`)
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      stats?.server?.geminiConfigured
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    Key Aktif: {stats?.server?.geminiMaskedKey || '-'}
                  </span>
                </div>

                {/* Test Gemini AI Ping */}
                <div className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[#163A5F]">
                        Diagnostik Koneksi LLM Google Gemini
                      </div>
                      <p className="text-xs text-[#4A6382]">
                        Uji kecepatan soket IPv4 server & lihat pemakaian token respons uji.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={testingGemini}
                      onClick={handleTestGeminiConnection}
                      className="bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play size={14} />
                      <span>
                        {testingGemini ? 'Menguji Koneksi...' : 'Test Ping Gemini AI'}
                      </span>
                    </button>
                  </div>

                  {geminiTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs border ${
                        geminiTestResult.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="font-bold">
                        {geminiTestResult.ok
                          ? `✓ Koneksi Berhasil — Latensi: ${
                              geminiTestResult.latencyMs
                            } ms • Token: ${
                              geminiTestResult.usage?.totalTokens || 0
                            } (In: ${geminiTestResult.usage?.promptTokens || 0}, Out: ${
                              geminiTestResult.usage?.completionTokens || 0
                            })`
                          : `✕ Koneksi Gagal (${geminiTestResult.latencyMs} ms): ${geminiTestResult.error}`}
                      </div>
                      {geminiTestResult.sampleReply && (
                        <div className="mt-1 text-[#243B55] italic">
                          "{geminiTestResult.sampleReply}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveServerConfig} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Ganti Google Gemini API Key (`GEMINI_API_KEY`)
                    </label>
                    <input
                      type="password"
                      value={newGeminiKey}
                      onChange={(e) => setNewGeminiKey(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin mengubah API Key..."
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Ganti Password Panel Admin (`ADMIN_PASSWORD`)
                    </label>
                    <input
                      type="password"
                      value={newAdminPwd}
                      onChange={(e) => setNewAdminPwd(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin mengubah password admin..."
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#102A45] hover:bg-[#1E3A5F] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Simpan Perubahan ke Server (`.env`)
                  </button>
                </form>
              </div>

              {/* Right 5 Cols: Database Maintenance & Table Summary */}
              <div className="lg:col-span-5 bg-white border border-[#C5DDF6] rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <Database size={20} className="text-[#1E5FA8]" />
                    <h2 className="font-extrabold text-base text-[#102A45]">
                      Statistik Tabel & Maintenance Database
                    </h2>
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm">
                    {[
                      {
                        table: 'users (Profil Siswa)',
                        count: stats?.database?.tables?.users || 0,
                      },
                      {
                        table: 'chat_sessions (Sesi Konseling)',
                        count: stats?.database?.tables?.chat_sessions || 0,
                      },
                      {
                        table: 'chat_messages (Pesan Percakapan)',
                        count: stats?.database?.tables?.chat_messages || 0,
                      },
                      {
                        table: 'counselor_requests (Tiket Guru BK)',
                        count: stats?.database?.tables?.counselor_requests || 0,
                      },
                      {
                        table: 'ai_usage_logs (Log Token AI)',
                        count: stats?.database?.tables?.ai_usage_logs || 0,
                      },
                    ].map((item) => (
                      <div
                        key={item.table}
                        className="flex items-center justify-between bg-[#F4F9FF] border border-[#D8E8F8] px-3.5 py-2 rounded-xl"
                      >
                        <span className="font-semibold text-[#163A5F]">
                          {item.table}
                        </span>
                        <span className="font-extrabold text-[#1E5FA8]">
                          {item.count} baris
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#4A6382]">
                    Tindakan Pemeliharaan Database
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDbMaintenance('vacuum', null)}
                      className="bg-[#EBF4FC] hover:bg-[#DCEBFA] text-[#163A5F] text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
                    >
                      Optimasi & VACUUM DB
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDbMaintenance(
                          'clear_sessions',
                          'Kosongkan seluruh sesi konseling dan pesan chat?'
                        )
                      }
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
                    >
                      Hapus Semua Sesi Chat
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDbMaintenance(
                          'clear_bk',
                          'Kosongkan seluruh tiket pengajuan Guru BK?'
                        )
                      }
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
                    >
                      Hapus Semua Tiket BK
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDbMaintenance(
                          'reset_all',
                          'PERINGATAN: Kosongkan SELURUH tabel database (termasuk semua user)?'
                        )
                      }
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
                    >
                      Reset Penuh Database
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent AI Token Usage Log Table */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  <h3 className="font-extrabold text-sm sm:text-base text-[#102A45]">
                    Riwayat Pemakaian Token AI Terbaru (Per Permintaan Chat)
                  </h3>
                </div>
                <span className="text-xs text-[#4A6382]">
                  Menampilkan {stats?.tokenUsage?.recentLogs?.length || 0} panggilan terakhir
                </span>
              </div>

              <div className="overflow-x-auto max-h-64 chat-scroll">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#E8F2FC] text-[#163A5F] border-b border-[#C5DDF6]">
                      <th className="py-2.5 px-3 font-extrabold">Waktu</th>
                      <th className="py-2.5 px-3 font-extrabold">Siswa</th>
                      <th className="py-2.5 px-3 font-extrabold">Model</th>
                      <th className="py-2.5 px-3 font-extrabold text-right">
                        Prompt Token
                      </th>
                      <th className="py-2.5 px-3 font-extrabold text-right">
                        Output Token
                      </th>
                      <th className="py-2.5 px-3 font-extrabold text-right">
                        Thought Token
                      </th>
                      <th className="py-2.5 px-3 font-extrabold text-right">
                        Total Token
                      </th>
                      <th className="py-2.5 px-3 font-extrabold text-right">
                        Latensi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(stats?.tokenUsage?.recentLogs || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-[#4A6382]"
                        >
                          Belum ada riwayat pemakaian token AI.
                        </td>
                      </tr>
                    ) : (
                      stats.tokenUsage.recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FBFF]">
                          <td className="py-2 px-3 text-[#4A6382] font-mono">
                            {log.created_at}
                          </td>
                          <td className="py-2 px-3 font-bold text-[#163A5F]">
                            {log.user_name || 'Tes Admin / Sistem'}
                          </td>
                          <td className="py-2 px-3 font-mono text-[#1E5FA8]">
                            {log.model_name}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatNum(log.prompt_tokens)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                            {formatNum(log.completion_tokens)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-purple-700">
                            {formatNum(log.thought_tokens)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-[#102A45]">
                            {formatNum(log.total_tokens)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[#4A6382]">
                            {log.latency_ms} ms
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Server Activity Log Console */}
            <div className="bg-[#0F243C] text-slate-200 rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-sky-400" />
                  <h3 className="font-bold text-sm text-white">
                    Log Aktivitas Server Real-Time ({stats?.logs?.length || 0} entri)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleDbMaintenance('clear_logs', null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Bersihkan Log
                </button>
              </div>
              <div className="bg-[#091728] rounded-xl p-3.5 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5 chat-scroll">
                {(stats?.logs || []).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <span className="text-slate-500 shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString('id-ID')}]
                    </span>
                    <span
                      className={`font-bold shrink-0 px-1.5 rounded text-[10px] ${
                        log.level === 'ERROR'
                          ? 'bg-red-500/20 text-red-300'
                          : log.level === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-300'
                          : log.level === 'AI'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.level === 'SQL'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-slate-200 break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: FORMAT PEMBUKA AI, PERSONA KONSELOR, & DETAIL TOKEN AI
           =================================================================== */}
        {activeTab === 'ai_config' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                  Pengaturan Format Pembuka AI & Statistik Token
                </h1>
                <p className="text-xs sm:text-sm text-[#4A6382]">
                  Kustomisasi pesan sapaan pembuka saat siswa memulai sesi konseling, atur instruksi karakter AI, dan pantau pemakaian token per siswa.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetAiSettingsToDefault}
                  className="bg-white hover:bg-slate-50 border border-[#C5DDF6] text-[#163A5F] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Reset ke Default</span>
                </button>
                <button
                  type="button"
                  disabled={savingAiSettings}
                  onClick={handleSaveAiSettings}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-60 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Save size={16} />
                  <span>
                    {savingAiSettings ? 'Menyimpan...' : 'Simpan Pengaturan AI'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Editor Format Pembuka AI & Persona */}
              <form
                onSubmit={handleSaveAiSettings}
                className="lg:col-span-7 bg-white border border-[#C5DDF6] rounded-2xl p-6 shadow-2xs space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={19} className="text-[#1E5FA8]" />
                    <h2 className="font-extrabold text-base text-[#102A45]">
                      Format Pesan Pembuka Sesi Konseling AI
                    </h2>
                  </div>
                </div>

                {/* Variable Placeholders Info */}
                <div className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl p-3.5 text-xs text-[#243B55] space-y-1.5">
                  <div className="font-bold text-[#163A5F]">
                    Variabel Otomatis yang Tersedia:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <code className="bg-white border border-[#B8D4F2] px-2 py-0.5 rounded font-bold text-[#1E5FA8]">
                      {'{nama}'}
                    </code>
                    <span>→ Nama pengguna</span>
                    <code className="bg-white border border-[#B8D4F2] px-2 py-0.5 rounded font-bold text-[#1E5FA8]">
                      {'{topik}'}
                    </code>
                    <span>→ Judul topik yang dipilih</span>
                  </div>
                </div>

                {/* Mode Selection: Global vs Per-Topic */}
                <div>
                  <label className="block text-xs font-bold text-[#184B78] mb-2">
                    Mode Format Sapaan Pembuka AI
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAiSettings({ ...aiSettings, openingMode: 'global' })
                      }
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        aiSettings.openingMode === 'global'
                          ? 'bg-[#E6F1FC] border-[#1E5FA8] font-bold text-[#163A5F]'
                          : 'bg-white border-[#D8E8F8] text-[#4A6382]'
                      }`}
                    >
                      <div className="font-extrabold text-[#163A5F]">
                        1. Format Pembuka Global (Seragam)
                      </div>
                      <div className="mt-0.5 text-[11px]">
                        Satu format sapaan pembuka untuk semua topik konseling.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAiSettings({ ...aiSettings, openingMode: 'per_topic' })
                      }
                      className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                        aiSettings.openingMode === 'per_topic'
                          ? 'bg-[#E6F1FC] border-[#1E5FA8] font-bold text-[#163A5F]'
                          : 'bg-white border-[#D8E8F8] text-[#4A6382]'
                      }`}
                    >
                      <div className="font-extrabold text-[#163A5F]">
                        2. Format Spesifik per Topik (4 Topik)
                      </div>
                      <div className="mt-0.5 text-[11px]">
                        Sapaan pembuka berbeda menyesuaikan topik yang dipilih.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Global Greeting Textarea */}
                {aiSettings.openingMode === 'global' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                      Teks Sapaan Pembuka Global
                    </label>
                    <textarea
                      rows={3}
                      value={aiSettings.globalGreeting}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          globalGreeting: e.target.value,
                        })
                      }
                      placeholder="Terima kasih sudah memilih topik ini..."
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl p-3.5 text-xs sm:text-sm text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(topicLabels).map(([tId, tLabel]) => (
                      <div key={tId}>
                        <label className="block text-xs font-bold text-[#184B78] mb-1">
                          Pembuka Topik: {tLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={aiSettings.topicGreetings?.[tId] || ''}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              topicGreetings: {
                                ...(aiSettings.topicGreetings || {}),
                                [tId]: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl p-3 text-xs sm:text-sm text-[#163A5F]"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Opening Footer & Quick Replies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Kalimat Footer Pembuka (Opsional)
                    </label>
                    <input
                      type="text"
                      value={aiSettings.openingFooter || ''}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          openingFooter: e.target.value,
                        })
                      }
                      placeholder="Contoh: Ceritamu aman dan rahasia di sini 💙"
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Opsi Tombol Cepat Pembuka (1 per baris, Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={aiSettings.openingQuickRepliesText || ''}
                      onChange={(e) =>
                        setAiSettings({
                          ...aiSettings,
                          openingQuickRepliesText: e.target.value,
                        })
                      }
                      placeholder={
                        'Aku merasa dijauhi teman\nAku bingung harus mulai cerita dari mana'
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2 text-xs text-[#163A5F]"
                    />
                  </div>
                </div>

                {/* System Persona Prompt */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                    Instruksi Karakter & Persona Konselor AI (`System Prompt`)
                  </label>
                  <textarea
                    rows={3}
                    value={aiSettings.systemPersona || ''}
                    onChange={(e) =>
                      setAiSettings({
                        ...aiSettings,
                        systemPersona: e.target.value,
                      })
                    }
                    className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl p-3.5 text-xs sm:text-sm text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAiSettings}
                    className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow transition cursor-pointer"
                  >
                    <Save size={16} />
                    <span>Simpan Format Pembuka & Persona AI</span>
                  </button>
                </div>
              </form>

              {/* Right 5 Cols: Live Preview of Opening Bubble + Per-User Token Ranking */}
              <div className="lg:col-span-5 space-y-6">
                {/* Live Preview Card */}
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#102A45]">
                      Pratinjau Sapaan Pembuka AI
                    </h3>
                    <select
                      value={previewTopic}
                      onChange={(e) => setPreviewTopic(e.target.value)}
                      className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-lg px-2.5 py-1 text-xs font-bold text-[#163A5F]"
                    >
                      <option value="friendship">Topik: Pertemanan</option>
                      <option value="communication">Topik: Komunikasi</option>
                      <option value="confidence">Topik: Kepercayaan Diri</option>
                      <option value="bullying">Topik: Bullying</option>
                    </select>
                  </div>

                  <div className="bg-[#F4F9FF] border border-[#D8E8F8] rounded-2xl p-4">
                    <div className="flex items-start gap-2.5">
                      <SociaHeartLogo size={32} className="shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="bg-[#E9F2FC] border border-[#CFE3F8] text-[#1E3A5F] rounded-2xl rounded-tl-sm p-3.5 text-xs sm:text-sm leading-relaxed space-y-2">
                          <p className="whitespace-pre-line">
                            {renderPreviewGreeting()}
                          </p>
                          {renderPreviewFooter() && (
                            <p className="font-semibold text-[#163A5F] pt-1">
                              {renderPreviewFooter()}
                            </p>
                          )}
                        </div>
                        {String(aiSettings.openingQuickRepliesText || '')
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {String(aiSettings.openingQuickRepliesText || '')
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .map((qr, i) => (
                                <span
                                  key={i}
                                  className="bg-[#E3EFFC] text-[#184B78] border border-[#B4D2F2] font-bold text-[11px] px-3 py-1 rounded-full"
                                >
                                  {qr}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Usage Per User Ranking */}
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Zap size={17} className="text-amber-500" />
                      <h3 className="font-extrabold text-sm sm:text-base text-[#102A45]">
                        Pemakaian Token AI per User Siswa
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 chat-scroll">
                    {(stats?.tokenUsage?.byUser || []).length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#4A6382]">
                        Belum ada data penggunaan token per siswa.
                      </div>
                    ) : (
                      stats.tokenUsage.byUser.map((u, idx) => (
                        <div
                          key={idx}
                          className="bg-[#F4F9FF] border border-[#D8E8F8] rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#163A5F]">
                              {u.user_name || 'Tes Sistem / Admin'}
                            </div>
                            <div className="text-[11px] text-[#4A6382]">
                              {u.request_count} request • In:{' '}
                              {formatNum(u.prompt_tokens)} • Out:{' '}
                              {formatNum(u.completion_tokens)}
                            </div>
                          </div>
                          <span className="bg-[#1E5FA8] text-white font-extrabold px-3 py-1 rounded-full">
                            {formatNum(u.total_tokens)} tok
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: PENGOLAHAN DATABASE USER (FULL CRUD & USER INSPECTOR)
           =================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                  Pengolahan Database User (`users`)
                </h1>
                <p className="text-xs sm:text-sm text-[#4A6382]">
                  Kelola akun profil pengguna (cukup nama), tambah/edit/hapus user, lihat pemakaian token per user, dan inspeksi riwayat konseling.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A6382]"
                />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama atau ID..."
                  className="w-full bg-white border border-[#C5DDF6] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>
            </div>

            {/* Add New User Form */}
            <form
              onSubmit={handleCreateUser}
              className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-[#184B78] mb-1">
                  Tambah Pengguna Baru (Nama)
                </label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                  placeholder="Contoh: Rizky Pratama"
                  className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2 text-xs sm:text-sm"
                  required
                />
              </div>
              <div className="w-44">
                <label className="block text-xs font-bold text-[#184B78] mb-1">
                  Karakter Avatar
                </label>
                <select
                  value={newUserForm.avatarStyle}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, avatarStyle: e.target.value })
                  }
                  className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="student-female">Perempuan</option>
                  <option value="student-male">Laki-laki</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={16} />
                <span>Tambah ke Database</span>
              </button>
            </form>

            {/* Users Table */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#E8F2FC] text-[#163A5F] border-b border-[#C5DDF6]">
                      <th className="py-3.5 px-4 font-extrabold">ID</th>
                      <th className="py-3.5 px-4 font-extrabold">Nama Pengguna</th>
                      <th className="py-3.5 px-4 font-extrabold">
                        Status Kondisi (AI)
                      </th>
                      <th className="py-3.5 px-4 font-extrabold text-center">
                        Sesi Chat
                      </th>
                      <th className="py-3.5 px-4 font-extrabold text-center">
                        Total Pesan
                      </th>
                      <th className="py-3.5 px-4 font-extrabold text-center">
                        Token AI
                      </th>
                      <th className="py-3.5 px-4 font-extrabold text-center">
                        Tiket BK
                      </th>
                      <th className="py-3.5 px-4 font-extrabold">Terakhir Aktif</th>
                      <th className="py-3.5 px-4 font-extrabold text-right">
                        Aksi Database
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-8 text-center text-[#4A6382] font-medium"
                        >
                          Tidak ada data user yang ditemukan di database.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isUserEmergency = Number(u.is_emergency) === 1;
                        return (
                          <tr
                            key={u.id}
                            className={`transition ${
                              isUserEmergency
                                ? 'bg-red-50/90 hover:bg-red-100/80 border-l-4 border-l-red-600'
                                : 'hover:bg-[#F8FBFF]'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-[#4A6382]">
                              #{u.id}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar style={u.avatar_style} size={32} />
                                <span
                                  className={`font-bold ${
                                    isUserEmergency
                                      ? 'text-red-900'
                                      : 'text-[#163A5F]'
                                  }`}
                                >
                                  {u.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {isUserEmergency ? (
                                <div className="space-y-1 max-w-xs">
                                  <span className="inline-flex items-center gap-1 bg-red-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-full animate-pulse">
                                    🚨 DARURAT / SANGAT PARAH
                                  </span>
                                  {u.emergency_reason && (
                                    <div className="text-[11px] text-red-800 font-medium line-clamp-2">
                                      {u.emergency_reason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-2.5 py-0.5 rounded-full">
                                  ✓ Normal
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                {u.session_count}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">
                              {u.message_count}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                              {formatNum(u.total_tokens_used)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                {u.bk_count}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#4A6382]">
                              {u.last_active_at || u.created_at}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleUserEmergency(
                                      u,
                                      !isUserEmergency
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                                    isUserEmergency
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-red-100 hover:bg-red-600 text-red-700 hover:text-white'
                                  }`}
                                  title={
                                    isUserEmergency
                                      ? 'Selesaikan Status Darurat'
                                      : 'Tandai Kondisi Darurat'
                                  }
                                >
                                  {isUserEmergency
                                    ? '✓ Atasi Darurat'
                                    : '🚨 Set Darurat'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInspectUser(u.id)}
                                  className="p-2 rounded-lg bg-[#E8F2FC] hover:bg-[#1E5FA8] text-[#1E5FA8] hover:text-white transition cursor-pointer"
                                  title="Inspeksi Detail & Riwayat User"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUser({ ...u })}
                                  className="p-2 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white transition cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition cursor-pointer"
                                  title="Hapus User"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                <form
                  onSubmit={handleUpdateUser}
                  className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-[#163A5F]">
                      Edit Data User #{editingUser.id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Nama Pengguna
                    </label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, name: e.target.value })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Karakter Avatar
                    </label>
                    <select
                      value={editingUser.avatar_style}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          avatar_style: e.target.value,
                        })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-sm"
                    >
                      <option value="student-female">Perempuan</option>
                      <option value="student-male">Laki-laki</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1E5FA8] text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* User Deep Inspector Panel */}
            {inspectedUserDetail && (
              <div
                className={`bg-white border-2 rounded-3xl p-6 shadow-lg space-y-5 ${
                  Number(inspectedUserDetail.user.is_emergency) === 1
                    ? 'border-red-600'
                    : 'border-[#1E5FA8]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      style={inspectedUserDetail.user.avatar_style}
                      size={44}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base sm:text-lg text-[#102A45]">
                          Inspeksi Data User: {inspectedUserDetail.user.name}
                        </h3>
                        {Number(inspectedUserDetail.user.is_emergency) === 1 && (
                          <span className="bg-red-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse">
                            🚨 DARURAT / SANGAT PARAH
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#4A6382]">
                        ID Database: #{inspectedUserDetail.user.id} •{' '}
                        {inspectedUserDetail.sessions.length} Sesi Chat •{' '}
                        {inspectedUserDetail.messages.length} Pesan •{' '}
                        {formatNum(inspectedUserDetail.tokenSummary?.total_tokens)}{' '}
                        Token AI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleUserEmergency(
                          inspectedUserDetail.user,
                          Number(inspectedUserDetail.user.is_emergency) !== 1
                        )
                      }
                      className={`text-xs font-extrabold px-3.5 py-2 rounded-xl transition cursor-pointer ${
                        Number(inspectedUserDetail.user.is_emergency) === 1
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-red-100 hover:bg-red-600 text-red-700 hover:text-white'
                      }`}
                    >
                      {Number(inspectedUserDetail.user.is_emergency) === 1
                        ? '✓ Tandai Kondisi Darurat Selesai'
                        : '🚨 Tandai Kondisi Darurat'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectedUserDetail(null)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {Number(inspectedUserDetail.user.is_emergency) === 1 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-xs sm:text-sm text-red-950 space-y-1.5">
                    <div className="font-extrabold text-red-800 flex items-center gap-1.5">
                      <AlertTriangle size={16} />
                      <span>Detail Deteksi Darurat Berbasis AI:</span>
                    </div>
                    <div>
                      <strong>Alasan / Analisis AI:</strong>{' '}
                      {inspectedUserDetail.user.emergency_reason}
                    </div>
                    {inspectedUserDetail.user.emergency_warning_ai && (
                      <div>
                        <strong>Peringatan AI ke User:</strong>{' '}
                        {inspectedUserDetail.user.emergency_warning_ai}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-2.5">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#184B78]">
                      Log Percakapan Chat User ({inspectedUserDetail.messages.length}{' '}
                      pesan)
                    </div>
                    <div className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-4 max-h-80 overflow-y-auto space-y-2.5 chat-scroll">
                      {inspectedUserDetail.messages.length === 0 ? (
                        <div className="text-xs text-[#4A6382] text-center py-6">
                          User ini belum memiliki pesan percakapan.
                        </div>
                      ) : (
                        inspectedUserDetail.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl text-xs ${
                              m.sender === 'user'
                                ? 'bg-[#CFE4FA] text-[#153250] ml-6'
                                : 'bg-white border border-[#D8E8F8] text-[#1E3A5F] mr-6'
                            }`}
                          >
                            <div className="font-bold text-[10px] uppercase text-[#4A6382] mb-0.5">
                              {m.sender === 'user'
                                ? inspectedUserDetail.user.name
                                : 'SociaCare AI'}{' '}
                              (Sesi #{m.session_id})
                            </div>
                            <div>{m.content}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#184B78] mb-2">
                        Daftar Sesi Konseling ({inspectedUserDetail.sessions.length})
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {inspectedUserDetail.sessions.map((s) => (
                          <div
                            key={s.id}
                            className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl p-3 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-[#163A5F]">
                                Sesi #{s.id}: {s.topic_title}
                              </span>
                              <div className="text-[11px] text-[#4A6382]">
                                Status: {s.status} • Tahap: {s.stage}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSessionAdmin(s.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Hapus Sesi"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#184B78] mb-2">
                        Pengajuan Guru BK ({inspectedUserDetail.counselorRequests.length})
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {inspectedUserDetail.counselorRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl p-3 text-xs space-y-1"
                          >
                            <div className="font-bold text-[#163A5F]">
                              {req.topic_title} ({req.status})
                            </div>
                            <div className="text-[#243B55]">{req.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 4: MANAJEMEN SESI CHAT & TIKET GURU BK
           =================================================================== */}
        {activeTab === 'counseling' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                Manajemen Sesi Konseling & Tiket Guru BK
              </h1>
              <p className="text-xs sm:text-sm text-[#4A6382]">
                Tanggapi pengajuan konseling tatap muka Guru BK dari siswa dan kelola seluruh sesi percakapan aktif.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Headphones size={18} className="text-[#1E5FA8]" />
                    <h2 className="font-extrabold text-base text-[#102A45]">
                      Tiket Pengajuan Guru BK ({allBkRequests.length})
                    </h2>
                  </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 chat-scroll">
                  {allBkRequests.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#4A6382]">
                      Belum ada pengajuan konseling Guru BK dari siswa.
                    </div>
                  ) : (
                    allBkRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-4 space-y-2 text-xs sm:text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-[#163A5F]">
                              {req.user_name || `User #${req.user_id}`}
                            </span>
                            <div className="text-xs font-bold text-[#1E5FA8]">
                              {req.topic_title}
                            </div>
                          </div>
                          <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[#243B55] bg-white p-2.5 rounded-xl border border-[#D8E8F8]">
                          "{req.message}"
                        </p>
                        <div className="text-xs text-[#4A6382]">
                          Jadwal diminta: <strong>{req.preferred_schedule}</strong>
                        </div>
                        {req.counselor_reply && (
                          <div className="text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                            <strong>Balasan Guru BK:</strong> {req.counselor_reply}
                          </div>
                        )}
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingBk({ ...req })}
                            className="bg-[#1E5FA8] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            Ubah Status / Balas
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBk(req.id)}
                            className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#1E5FA8]" />
                    <h2 className="font-extrabold text-base text-[#102A45]">
                      Seluruh Sesi Chat Siswa ({allSessions.length})
                    </h2>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 chat-scroll">
                  {allSessions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#4A6382]">
                      Belum ada sesi konseling yang tercatat.
                    </div>
                  ) : (
                    allSessions.map((s) => (
                      <div
                        key={s.id}
                        className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-4 flex items-start justify-between gap-3 text-xs sm:text-sm"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#163A5F]">
                              #{s.id} • {s.user_name || `User #${s.user_id}`}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-[#1E5FA8]">
                            {s.topic_title}
                          </div>
                          <p className="text-xs text-[#4A6382] truncate">
                            {s.last_message}
                          </p>
                          <div className="text-[11px] text-slate-400">
                            {s.message_count} pesan
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('users');
                              handleInspectUser(s.user_id);
                            }}
                            className="p-2 rounded-lg bg-white border border-[#C5DDF6] text-[#1E5FA8] hover:bg-[#1E5FA8] hover:text-white transition cursor-pointer"
                            title="Lihat Transkrip Lengkap"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSessionAdmin(s.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer"
                            title="Hapus Sesi"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {editingBk && (
              <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                <form
                  onSubmit={handleSaveBkUpdate}
                  className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-[#163A5F]">
                      Tanggapi Tiket Guru BK #{editingBk.id}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingBk(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Status Pengajuan
                    </label>
                    <select
                      value={editingBk.status}
                      onChange={(e) =>
                        setEditingBk({ ...editingBk, status: e.target.value })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-sm"
                    >
                      <option>Menunggu Konfirmasi Guru BK</option>
                      <option>Terjadwal / Disetujui Guru BK</option>
                      <option>Selesai Konseling</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#184B78] mb-1">
                      Pesan Balasan Guru BK untuk Siswa
                    </label>
                    <textarea
                      rows={3}
                      value={editingBk.counselor_reply || ''}
                      onChange={(e) =>
                        setEditingBk({
                          ...editingBk,
                          counselor_reply: e.target.value,
                        })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBk(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-[#1E5FA8] text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                    >
                      Simpan Balasan
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 5: SQL QUERY CONSOLE & DATABASE EXPLORER
           =================================================================== */}
        {activeTab === 'sql' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                Interactive SQL Query Console
              </h1>
              <p className="text-xs sm:text-sm text-[#4A6382]">
                Jalankan perintah SQL langsung (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) untuk mengolah tabel database server.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: 'Tabel users',
                  sql: 'SELECT * FROM users ORDER BY id DESC;',
                },
                {
                  label: 'Tabel chat_sessions',
                  sql: 'SELECT * FROM chat_sessions ORDER BY id DESC;',
                },
                {
                  label: 'Tabel chat_messages',
                  sql: 'SELECT id, session_id, user_id, sender, content, created_at FROM chat_messages ORDER BY id DESC LIMIT 50;',
                },
                {
                  label: 'Tabel ai_usage_logs',
                  sql: 'SELECT * FROM ai_usage_logs ORDER BY id DESC LIMIT 50;',
                },
                {
                  label: 'Tabel app_settings',
                  sql: 'SELECT * FROM app_settings;',
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleRunSql(preset.sql)}
                  className="bg-white hover:bg-[#1E5FA8] text-[#163A5F] hover:text-white border border-[#C5DDF6] text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="bg-[#0F243C] rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs text-sky-300 font-mono">
                <span>SQL EDITOR ({stats?.database?.label || 'SQL Engine'})</span>
                {sqlResult && (
                  <span>
                    Waktu eksekusi: {sqlResult.durationMs} ms • Baris:{' '}
                    {sqlResult.rowCount ?? 0}
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full bg-[#091728] text-emerald-300 font-mono text-xs sm:text-sm p-4 rounded-xl border border-white/10 focus:outline-none focus:border-sky-400"
                placeholder="Tulis query SQL di sini..."
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={runningSql}
                  onClick={() => handleRunSql()}
                  className="bg-[#1E5FA8] hover:bg-[#2872C6] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <Play size={15} />
                  <span>{runningSql ? 'Menjalankan...' : 'Jalankan Query SQL'}</span>
                </button>
              </div>
            </div>

            {sqlResult && (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl shadow-2xs overflow-hidden">
                {!sqlResult.ok ? (
                  <div className="p-5 bg-red-50 text-red-700 font-mono text-xs sm:text-sm">
                    SQL Error: {sqlResult.error}
                  </div>
                ) : sqlResult.rows?.length === 0 ? (
                  <div className="p-6 text-center text-xs sm:text-sm text-[#4A6382]">
                    Query berhasil dijalankan ({sqlResult.durationMs} ms). Tidak ada baris yang dikembalikan.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[460px] chat-scroll">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#E8F2FC] text-[#163A5F] border-b border-[#C5DDF6]">
                          {Object.keys(sqlResult.rows[0]).map((col) => (
                            <th
                              key={col}
                              className="py-3 px-4 font-mono font-extrabold whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {sqlResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#F8FBFF]">
                            {Object.keys(sqlResult.rows[0]).map((col) => (
                              <td
                                key={col}
                                className="py-2.5 px-4 text-[#243B55] max-w-md truncate"
                                title={String(row[col] ?? '')}
                              >
                                {row[col] === null ? (
                                  <span className="text-slate-400">NULL</span>
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
