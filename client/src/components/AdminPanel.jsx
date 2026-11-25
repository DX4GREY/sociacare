import React, { useState, useEffect, useRef } from 'react';
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
  BookOpen,
  Video,
  FileText,
  Lightbulb,
  ExternalLink,
  Image,
  Brain,
  Clock,
  Calendar,
  UploadCloud,
  GraduationCap,
  EyeOff,
  Lock,
  Phone,
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
  const [deepseekTestResult, setDeepseekTestResult] = useState(null);
  const [testingDeepSeek, setTestingDeepSeek] = useState(false);

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
  const [newDeepseekKey, setNewDeepseekKey] = useState('');
  const [newDeepseekModel, setNewDeepseekModel] = useState('');
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

  // Teachers (Guru BK) Management State
  const [teachersList, setTeachersList] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: '',
    username: '',
    password: '',
    nip: '',
    phone: '',
  });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState(
    'SELECT id, name, avatar_style, created_at, last_active_at FROM users ORDER BY id DESC;'
  );
  const [sqlResult, setSqlResult] = useState(null);
  const [runningSql, setRunningSql] = useState(false);

  // Content Management State (Tips, Artikel, Video)
  const [contentTab, setContentTab] = useState('tips'); // 'tips' | 'articles' | 'videos'
  const [contentData, setContentData] = useState({ tips: [], articles: [], videos: [] });
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentSearch, setContentSearch] = useState('');

  const [newTipForm, setNewTipForm] = useState({
    category: 'Hubungan Pertemanan',
    title: '',
    description: '',
  });

  const [newArticleForm, setNewArticleForm] = useState({
    category: 'Hubungan Pertemanan',
    title: '',
    readTime: '3 menit',
    excerpt: '',
    content: '',
  });

  const [newVideoForm, setNewVideoForm] = useState({
    category: 'Hubungan Pertemanan',
    title: '',
    duration: '5:00',
    description: '',
    youtubeUrl: '',
    keyTakeaways: '',
  });

  // AI Continuous Learning & Reference Photos State
  const [learningTab, setLearningTab] = useState('photos'); // 'photos' | 'memories'
  const [photosList, setPhotosList] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [memoriesList, setMemoriesList] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const [photoForm, setPhotoForm] = useState({
    title: '',
    category: 'Hubungan Pertemanan',
    description: '',
    fileUrl: '',
    base64Data: '',
    preview: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [memoryForm, setMemoryForm] = useState({
    topicId: 'general',
    category: 'Pola Masalah Sosial Siswa',
    queryPattern: '',
    learnedInsight: '',
    keyTakeaway: '',
  });

  const notificationTimeoutRef = useRef(null);

  function showNotification(type, text) {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setBannerMsg({ type, text });
    if (type !== 'loading') {
      notificationTimeoutRef.current = setTimeout(() => {
        setBannerMsg(null);
        notificationTimeoutRef.current = null;
      }, 4500);
    }
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
      loadTeachers();
      loadContentData();
      loadPhotos();
      loadMemories();
    }
  }, [adminToken]);

  // Dynamic browser tab title
  useEffect(() => {
    if (!adminToken) {
      document.title = 'Login Panel Kontrol Administrator | SociaCare';
    } else {
      const tabTitles = {
        server: 'Server & Diagnostik — Panel Admin | SociaCare',
        ai_config: 'Konfigurasi AI & Gemini — Panel Admin | SociaCare',
        users: 'Database Siswa — Panel Admin | SociaCare',
        counseling: 'Sesi Chat & Guru BK — Panel Admin | SociaCare',
        teachers: 'Manajemen Akun Guru BK — Panel Admin | SociaCare',
        content: 'Kelola Materi Edukasi — Panel Admin | SociaCare',
        learning_photos: 'Pembelajaran AI & Foto — Panel Admin | SociaCare',
        sql: 'SQL Studio — Panel Admin | SociaCare',
      };
      document.title = tabTitles[activeTab] || 'Panel Kontrol Administrator | SociaCare';
    }
  }, [adminToken, activeTab]);

  async function loadPhotos() {
    setLoadingPhotos(true);
    try {
      const res = await fetch('/api/admin/photos', { headers: adminHeaders() });
      const data = await res.json();
      if (data.photos) setPhotosList(data.photos);
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  }

  async function loadMemories() {
    setLoadingMemories(true);
    try {
      const res = await fetch('/api/admin/learning-memory', { headers: adminHeaders() });
      const data = await res.json();
      if (data.memories) setMemoriesList(data.memories);
    } catch (err) {
      console.error('Error loading learning memories:', err);
    } finally {
      setLoadingMemories(false);
    }
  }

  function handlePhotoFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'File yang dipilih harus berupa gambar (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showNotification('error', 'Ukuran foto maksimal 20MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoForm((prev) => ({
        ...prev,
        base64Data: reader.result,
        preview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleAddPhoto(e) {
    e.preventDefault();
    if (!photoForm.title.trim()) {
      showNotification('error', 'Judul foto referensi wajib diisi.');
      return;
    }
    if (!photoForm.base64Data && !photoForm.fileUrl.trim()) {
      showNotification('error', 'Pilih file foto dari perangkat Anda atau masukkan URL foto.');
      return;
    }

    setUploadingPhoto(true);
    showNotification('loading', 'Sedang mengunggah dan memproses foto referensi ke server...');

    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          title: photoForm.title,
          category: photoForm.category,
          description: photoForm.description,
          fileUrl: photoForm.fileUrl,
          base64Data: photoForm.base64Data,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Foto referensi "${photoForm.title}" berhasil disimpan ke sistem!`);
        setPhotoForm({
          title: '',
          category: 'Hubungan Pertemanan',
          description: '',
          fileUrl: '',
          base64Data: '',
          preview: '',
        });
        await loadPhotos();
      } else {
        showNotification('error', data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(id, title) {
    if (!window.confirm(`Yakin ingin menghapus foto referensi "${title}"? AI tidak akan lagi menggunakan foto ini.`)) return;
    try {
      const res = await fetch(`/api/admin/photos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Foto referensi berhasil dihapus.');
        await loadPhotos();
      } else {
        showNotification('error', 'Gagal menghapus foto referensi.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleAddMemory(e) {
    e.preventDefault();
    if (!memoryForm.queryPattern.trim() || !memoryForm.learnedInsight.trim()) {
      showNotification('error', 'Pola masalah siswa dan solusi wawasan wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/admin/learning-memory', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(memoryForm),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Memori pembelajaran baru berhasil ditambahkan ke AI!');
        setMemoryForm({
          topicId: 'general',
          category: 'Pola Masalah Sosial Siswa',
          queryPattern: '',
          learnedInsight: '',
          keyTakeaway: '',
        });
        await loadMemories();
      } else {
        showNotification('error', data.error || 'Gagal menambahkan memori.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteMemory(id, pattern) {
    if (!window.confirm(`Hapus pembelajaran ini dari memori AI?\n"${pattern?.slice(0, 60)}..."`)) return;
    try {
      const res = await fetch(`/api/admin/learning-memory/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Memori pembelajaran berhasil dihapus.');
        await loadMemories();
      } else {
        showNotification('error', 'Gagal menghapus memori pembelajaran.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function loadContentData() {
    setLoadingContent(true);
    try {
      const res = await fetch('/api/content/extras');
      const data = await res.json();
      if (data.tips) {
        setContentData({
          tips: data.tips || [],
          articles: data.articles || [],
          videos: data.videos || [],
        });
      }
    } catch (err) {
      console.error('Error loading content data:', err);
    } finally {
      setLoadingContent(false);
    }
  }

  async function handleAddTip(e) {
    e.preventDefault();
    if (!newTipForm.title.trim() || !newTipForm.description.trim()) {
      showNotification('error', 'Judul dan deskripsi tips wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/content/tips', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newTipForm),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Tips baru "${newTipForm.title}" berhasil ditambahkan!`);
        setNewTipForm({
          category: 'Hubungan Pertemanan',
          title: '',
          description: '',
        });
        await loadContentData();
      } else {
        showNotification('error', data.error || 'Gagal menambahkan tips.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteTip(id, title) {
    if (!window.confirm(`Yakin ingin menghapus tips "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/tips/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Tips berhasil dihapus.');
        await loadContentData();
      } else {
        showNotification('error', 'Gagal menghapus tips.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleAddArticle(e) {
    e.preventDefault();
    if (!newArticleForm.title.trim() || !newArticleForm.content.trim()) {
      showNotification('error', 'Judul dan isi artikel wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/content/articles', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newArticleForm),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Artikel "${newArticleForm.title}" berhasil diterbitkan!`);
        setNewArticleForm({
          category: 'Hubungan Pertemanan',
          title: '',
          readTime: '3 menit',
          excerpt: '',
          content: '',
        });
        await loadContentData();
      } else {
        showNotification('error', data.error || 'Gagal menerbitkan artikel.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteArticle(id, title) {
    if (!window.confirm(`Yakin ingin menghapus artikel "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/articles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Artikel berhasil dihapus.');
        await loadContentData();
      } else {
        showNotification('error', 'Gagal menghapus artikel.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleAddVideo(e) {
    e.preventDefault();
    if (!newVideoForm.title.trim() || !newVideoForm.youtubeUrl.trim()) {
      showNotification('error', 'Judul dan Link/ID YouTube wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/content/videos', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          category: newVideoForm.category,
          title: newVideoForm.title,
          duration: newVideoForm.duration,
          description: newVideoForm.description,
          youtubeUrlOrId: newVideoForm.youtubeUrl,
          keyTakeaways: newVideoForm.keyTakeaways,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Video edukasi "${newVideoForm.title}" berhasil ditambahkan!`);
        setNewVideoForm({
          category: 'Hubungan Pertemanan',
          title: '',
          duration: '5:00',
          description: '',
          youtubeUrl: '',
          keyTakeaways: '',
        });
        await loadContentData();
      } else {
        showNotification('error', data.error || 'Gagal menambahkan video.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteVideo(id, title) {
    if (!window.confirm(`Yakin ingin menghapus video "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/videos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Video berhasil dihapus.');
        await loadContentData();
      } else {
        showNotification('error', 'Gagal menghapus video.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

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

  async function loadTeachers() {
    setLoadingTeachers(true);
    try {
      const res = await fetch('/api/admin/teachers', { headers: adminHeaders() });
      if (res.status === 401) return handleAdminLogout();
      const data = await res.json();
      if (data.teachers) setTeachersList(data.teachers);
    } catch (err) {
      console.error('Error loading teachers:', err);
      showNotification('error', 'Gagal memuat daftar Guru BK.');
    } finally {
      setLoadingTeachers(false);
    }
  }

  async function handleCreateTeacher(e) {
    e.preventDefault();
    if (!newTeacherForm.name.trim() || !newTeacherForm.username.trim() || !newTeacherForm.password.trim()) {
      showNotification('error', 'Nama, username, dan password Guru BK wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newTeacherForm),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Akun Guru BK "${newTeacherForm.name}" (@${newTeacherForm.username}) berhasil dibuat!`);
        setNewTeacherForm({ name: '', username: '', password: '', nip: '', phone: '' });
        setShowTeacherModal(false);
        await loadTeachers();
      } else {
        showNotification('error', data.error || 'Gagal membuat akun Guru BK.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleUpdateTeacher(e) {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      const res = await fetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify(editingTeacher),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', `Akun Guru BK "${editingTeacher.name}" berhasil diperbarui!`);
        setEditingTeacher(null);
        await loadTeachers();
      } else {
        showNotification('error', data.error || 'Gagal memperbarui akun Guru BK.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeleteTeacher(t) {
    if (!window.confirm(`Hapus akun Guru BK "${t.name}" (@${t.username})? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/admin/teachers/${t.id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      if (res.ok) {
        showNotification('success', `Akun Guru BK "${t.name}" berhasil dihapus.`);
        await loadTeachers();
      } else {
        showNotification('error', 'Gagal menghapus akun Guru BK.');
      }
    } catch (err) {
      showNotification('error', err.message);
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

  async function handleTestDeepSeekConnection() {
    setTestingDeepSeek(true);
    setDeepseekTestResult(null);
    try {
      const res = await fetch('/api/admin/test-deepseek', {
        method: 'POST',
        headers: adminHeaders(),
      });
      const data = await res.json();
      setDeepseekTestResult(data);
      loadServerStats();
    } catch (err) {
      setDeepseekTestResult({ ok: false, error: err.message });
    } finally {
      setTestingDeepSeek(false);
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
          deepseekApiKey: newDeepseekKey,
          deepseekModel: newDeepseekModel,
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
        setNewDeepseekKey('');
        setNewDeepseekModel('');
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
              <label htmlFor="admin-login-pwd" className="block text-xs font-bold text-[#184B78] mb-1.5">
                Password Administrator
              </label>
              <input
                id="admin-login-pwd"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan Password Administrator"
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
                setActiveTab('teachers');
                loadTeachers();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'teachers'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap size={18} />
                <span>Akun Guru BK</span>
              </div>
              <span className="bg-sky-400/20 text-sky-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {teachersList.length} Akun
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('content');
                loadContentData();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'content'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={18} />
                <span>Kelola Materi Edukasi</span>
              </div>
              <span className="bg-emerald-400/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Tips • Artikel • Video
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('learning_photos');
                loadPhotos();
                loadMemories();
              }}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'learning_photos'
                  ? 'bg-[#1E5FA8] text-white shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Brain size={18} />
                <span>Pembelajaran AI & Foto</span>
              </div>
              <span className="bg-purple-400/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {memoriesList.length} memori
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

        {/* Floating Toast Notification */}
        {bannerMsg && (
          <div
            className={`fixed top-5 right-5 z-50 max-w-md px-5 py-3.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 border transition-all duration-200 ${
              bannerMsg.type === 'error'
                ? 'bg-red-600 text-white border-red-700 shadow-red-900/20'
                : bannerMsg.type === 'loading'
                ? 'bg-[#1E5FA8] text-white border-[#15467E] shadow-blue-900/30'
                : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {bannerMsg.type === 'loading' ? (
                <RefreshCw size={18} className="animate-spin shrink-0 text-white" />
              ) : bannerMsg.type === 'error' ? (
                <AlertTriangle size={18} className="shrink-0 text-white" />
              ) : (
                <CheckCircle2 size={18} className="shrink-0 text-white" />
              )}
              <span className="leading-snug">{bannerMsg.text}</span>
            </div>
            {bannerMsg.type !== 'loading' && (
              <button
                type="button"
                onClick={() => setBannerMsg(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition shrink-0 cursor-pointer ml-1"
              >
                <X size={15} />
              </button>
            )}
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

                {/* Test DeepSeek AI Ping (Fallback Terakhir) */}
                <div className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#163A5F]">
                          Diagnostik Koneksi LLM DeepSeek (Fallback Terakhir)
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            stats?.server?.deepseekConfigured
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {stats?.server?.deepseekConfigured ? `Key Aktif (${stats?.server?.deepseekMaskedKey})` : 'Key Belum Diatur'}
                        </span>
                      </div>
                      <p className="text-xs text-[#4A6382]">
                        Uji koneksi ke `api.deepseek.com` (Model: {stats?.server?.deepseekModel || 'deepseek-chat'}) saat model Gemini bermasalah.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={testingDeepSeek}
                      onClick={handleTestDeepSeekConnection}
                      className="bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play size={14} />
                      <span>
                        {testingDeepSeek ? 'Menguji DeepSeek...' : 'Test Ping DeepSeek AI'}
                      </span>
                    </button>
                  </div>

                  {deepseekTestResult && (
                    <div
                      className={`p-3 rounded-xl text-xs border ${
                        deepseekTestResult.ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="font-bold">
                        {deepseekTestResult.ok
                          ? `✓ Koneksi DeepSeek Berhasil — Latensi: ${
                              deepseekTestResult.latencyMs
                            } ms • Token: ${
                              deepseekTestResult.usage?.totalTokens || 0
                            } (In: ${deepseekTestResult.usage?.promptTokens || 0}, Out: ${
                              deepseekTestResult.usage?.completionTokens || 0
                            })`
                          : `✕ Koneksi DeepSeek Gagal (${deepseekTestResult.latencyMs} ms): ${deepseekTestResult.error}`}
                      </div>
                      {deepseekTestResult.sampleReply && (
                        <div className="mt-1 text-[#243B55] italic">
                          "{deepseekTestResult.sampleReply}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveServerConfig} className="space-y-3.5">
                  <div>
                    <label htmlFor="config-gemini-key" className="block text-xs font-bold text-[#184B78] mb-1">
                      Ganti Google Gemini API Key (`GEMINI_API_KEY`)
                    </label>
                    <input
                      id="config-gemini-key"
                      name="gemini-api-key"
                      type="password"
                      autoComplete="off"
                      spellCheck="false"
                      value={newGeminiKey}
                      onChange={(e) => setNewGeminiKey(e.target.value)}
                      placeholder="Kosongkan jika tidak ingin mengubah API Key..."
                      className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="config-deepseek-key" className="block text-xs font-bold text-[#184B78] mb-1">
                        DeepSeek API Key (`DEEPSEEK_API_KEY`)
                      </label>
                      <input
                        id="config-deepseek-key"
                        name="deepseek-api-key"
                        type="password"
                        autoComplete="off"
                        spellCheck="false"
                        value={newDeepseekKey}
                        onChange={(e) => setNewDeepseekKey(e.target.value)}
                        placeholder="sk-xxxxxxxxxxxxxxxx (Kosongkan jika tidak ubah)..."
                        className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                      />
                    </div>
                    <div>
                      <label htmlFor="config-deepseek-model" className="block text-xs font-bold text-[#184B78] mb-1">
                        Model DeepSeek (`DEEPSEEK_MODEL`)
                      </label>
                      <input
                        id="config-deepseek-model"
                        name="deepseek-model"
                        type="text"
                        value={newDeepseekModel}
                        onChange={(e) => setNewDeepseekModel(e.target.value)}
                        placeholder="Contoh: deepseek-chat atau deepseek-reasoner"
                        className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="config-admin-pwd" className="block text-xs font-bold text-[#184B78] mb-1">
                      Ganti Password Panel Admin (`ADMIN_PASSWORD`)
                    </label>
                    <input
                      id="config-admin-pwd"
                      name="new-admin-password"
                      type="password"
                      autoComplete="new-password"
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
            TAB: MANAJEMEN AKUN GURU BK & KONSELOR
           =================================================================== */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#C5DDF6] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-[#E8F2FC] text-[#1E5FA8]">
                    <GraduationCap size={26} />
                  </span>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[#102A45]">
                      Manajemen Akun Guru BK & Konselor
                    </h1>
                    <p className="text-xs sm:text-sm text-[#4A6382] mt-0.5">
                      Admin dapat membuat username dan password tersendiri untuk Guru BK, mengelola data konselor, maupun mereset akses login portal /guru.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTeacherModal(true)}
                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus size={18} />
                <span>+ Buat Akun Guru BK Baru</span>
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Cari nama, username, atau NIP Guru BK..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#C5DDF6] rounded-xl text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-[#184B78]">
                <span>Total Guru BK Terdaftar:</span>
                <span className="bg-[#E8F2FC] text-[#1E5FA8] px-2.5 py-0.5 rounded-full font-extrabold">
                  {teachersList.length}
                </span>
              </div>
            </div>

            {/* Teacher Cards Grid */}
            {teachersList.filter((t) => {
              const q = teacherSearch.toLowerCase().trim();
              return !q || t.name?.toLowerCase().includes(q) || t.username?.toLowerCase().includes(q) || t.nip?.toLowerCase().includes(q);
            }).length === 0 ? (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada data Guru BK. Klik tombol "+ Buat Akun Guru BK Baru" untuk menambahkan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {teachersList
                  .filter((t) => {
                    const q = teacherSearch.toLowerCase().trim();
                    return !q || t.name?.toLowerCase().includes(q) || t.username?.toLowerCase().includes(q) || t.nip?.toLowerCase().includes(q);
                  })
                  .map((teacher) => {
                    const isVisible = Boolean(showPasswordMap[teacher.id]);
                    return (
                      <div
                        key={teacher.id}
                        className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 shadow-2xs space-y-4 transition flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-[#E8F2FC] text-[#1E5FA8] flex items-center justify-center font-extrabold text-lg">
                                <GraduationCap size={24} />
                              </div>
                              <div>
                                <h3 className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                                  {teacher.name}
                                </h3>
                                <div className="text-xs text-[#4A6382] font-semibold flex items-center gap-1.5 mt-0.5">
                                  <span>ID #{teacher.id}</span>
                                  <span>•</span>
                                  <span className="text-[#1E5FA8] font-bold">@{teacher.username}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                Number(teacher.is_active) === 1
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {Number(teacher.is_active) === 1 ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>

                          <div className="bg-[#F8FBFE] border border-[#E1EEFA] rounded-2xl p-3.5 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[#4A6382] font-semibold">Username Login:</span>
                              <code className="bg-white px-2 py-0.5 rounded-md border border-[#C5DDF6] font-mono font-extrabold text-[#163A5F]">
                                {teacher.username}
                              </code>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[#4A6382] font-semibold">Password:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="bg-white px-2 py-0.5 rounded-md border border-[#C5DDF6] font-mono text-xs text-[#163A5F]">
                                  •••••••• (Tersimpan Terenkripsi Hash)
                                </span>
                              </div>
                            </div>

                            {teacher.nip && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#4A6382] font-semibold">NIP / NUPTK:</span>
                                <span className="font-semibold text-[#163A5F]">{teacher.nip}</span>
                              </div>
                            )}

                            {teacher.phone && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#4A6382] font-semibold">No. HP / WA:</span>
                                <span className="font-semibold text-[#163A5F]">{teacher.phone}</span>
                              </div>
                            )}

                            <div className="pt-1 border-t border-[#E1EEFA] text-[10px] text-slate-400">
                              Dibuat: {teacher.created_at || 'Baru saja'}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer text-xs"
                            title="Hapus Akun Guru BK"
                          >
                            <Trash2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingTeacher({ ...teacher, password: '' })}
                            className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Edit3 size={13} />
                            <span>Edit / Ubah Password</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* MODAL: TAMBAH GURU BK BARU */}
            {showTeacherModal && (
              <div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setShowTeacherModal(false)}
              >
                <div
                  className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
                    <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-base sm:text-lg">
                      <GraduationCap size={22} className="text-[#1E5FA8]" />
                      <span>Buat Akun Guru BK Baru</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTeacherModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTeacher} className="space-y-3.5 text-xs sm:text-sm">
                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Nama Lengkap Guru BK:
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeacherForm.name}
                        onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                        placeholder="Contoh: Dra. Hj. Siti Nurhaliza, M.Pd"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Username Login (Huruf kecil / tanpa spasi):
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeacherForm.username}
                        onChange={(e) => setNewTeacherForm({ ...newTeacherForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        placeholder="Contoh: sitinurhaliza, gurubk2"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Password Login Guru BK:
                      </label>
                      <input
                        type="text"
                        required
                        value={newTeacherForm.password}
                        onChange={(e) => setNewTeacherForm({ ...newTeacherForm, password: e.target.value })}
                        placeholder="Masukkan password untuk login Guru BK"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                          NIP / NUPTK (Opsional):
                        </label>
                        <input
                          type="text"
                          value={newTeacherForm.nip}
                          onChange={(e) => setNewTeacherForm({ ...newTeacherForm, nip: e.target.value })}
                          placeholder="Contoh: 19800101..."
                          className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                          No. HP / WA (Opsional):
                        </label>
                        <input
                          type="text"
                          value={newTeacherForm.phone}
                          onChange={(e) => setNewTeacherForm({ ...newTeacherForm, phone: e.target.value })}
                          placeholder="0812..."
                          className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTeacherModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Buat Akun Guru BK
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL: EDIT AKUN GURU BK & GANTI PASSWORD */}
            {editingTeacher && (
              <div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setEditingTeacher(null)}
              >
                <div
                  className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
                    <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-base sm:text-lg">
                      <Edit3 size={20} className="text-[#1E5FA8]" />
                      <span>Edit Akun Guru BK #{editingTeacher.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingTeacher(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateTeacher} className="space-y-3.5 text-xs sm:text-sm">
                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Nama Lengkap:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTeacher.name}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Username Login:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTeacher.username}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                        Password Baru (Kosongkan jika tidak ingin mengubah):
                      </label>
                      <input
                        type="text"
                        value={editingTeacher.password || ''}
                        onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                        placeholder="Ketik password baru jika ingin mereset"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                          NIP / NUPTK:
                        </label>
                        <input
                          type="text"
                          value={editingTeacher.nip || ''}
                          onChange={(e) => setEditingTeacher({ ...editingTeacher, nip: e.target.value })}
                          className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                          Status Akun:
                        </label>
                        <select
                          value={Number(editingTeacher.is_active) === 1 ? '1' : '0'}
                          onChange={(e) => setEditingTeacher({ ...editingTeacher, is_active: Number(e.target.value) })}
                          className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                        >
                          <option value="1">Aktif (Bisa Login)</option>
                          <option value="0">Nonaktif (Diblokir)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTeacher(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </form>
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

        {/* =================================================================== */}
        {/* TAB 6: KELOLA MATERI EDUKASI (TIPS, ARTIKEL, & VIDEO)              */}
        {/* =================================================================== */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white border border-[#C5DDF6] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-[#E8F2FC] text-[#1E5FA8]">
                    <BookOpen size={24} />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#163A5F]">
                    Kelola Materi Edukasi Siswa
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#4A6382] mt-1.5 leading-relaxed max-w-2xl">
                  Admin dapat menambahkan Tips Sosial, Artikel Informasi, dan Video Edukasi YouTube baru. Konten yang ditambahkan akan langsung tampil di halaman <strong>Fitur Lainnya</strong> untuk siswa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadContentData}
                  disabled={loadingContent}
                  className="bg-[#EBF4FD] hover:bg-[#DCEBFA] text-[#1E5FA8] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 cursor-pointer border border-[#C5DDF6]"
                >
                  <RefreshCw size={15} className={loadingContent ? 'animate-spin' : ''} />
                  <span>Refresh Materi</span>
                </button>
              </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-[#E8F2FC] rounded-2xl max-w-fit border border-[#C5DDF6]">
              <button
                type="button"
                onClick={() => setContentTab('tips')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  contentTab === 'tips'
                    ? 'bg-[#1E5FA8] text-white shadow-xs'
                    : 'text-[#163A5F] hover:bg-white/60'
                }`}
              >
                <Lightbulb size={16} />
                <span>Tips Sosial</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  contentTab === 'tips' ? 'bg-white/20 text-white' : 'bg-[#D2E4F7] text-[#1E5FA8]'
                }`}>
                  {contentData.tips.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setContentTab('articles')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  contentTab === 'articles'
                    ? 'bg-[#1E5FA8] text-white shadow-xs'
                    : 'text-[#163A5F] hover:bg-white/60'
                }`}
              >
                <FileText size={16} />
                <span>Artikel Informasi</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  contentTab === 'articles' ? 'bg-white/20 text-white' : 'bg-[#D2E4F7] text-[#1E5FA8]'
                }`}>
                  {contentData.articles.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setContentTab('videos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  contentTab === 'videos'
                    ? 'bg-[#1E5FA8] text-white shadow-xs'
                    : 'text-[#163A5F] hover:bg-white/60'
                }`}
              >
                <Video size={16} />
                <span>Video Edukasi</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  contentTab === 'videos' ? 'bg-white/20 text-white' : 'bg-[#D2E4F7] text-[#1E5FA8]'
                }`}>
                  {contentData.videos.length}
                </span>
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SUB-TAB 1: TIPS SOSIAL                                        */}
            {/* ------------------------------------------------------------- */}
            {contentTab === 'tips' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Tambah Tips (Col 1) */}
                <div className="lg:col-span-1 bg-white border border-[#C5DDF6] rounded-3xl p-6 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-[#163A5F]">
                    <Plus size={18} className="text-[#1E5FA8]" />
                    <span>Tambah Tips Sosial Baru</span>
                  </div>

                  <form onSubmit={handleAddTip} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Kategori Konflik / Topik
                      </label>
                      <select
                        value={newTipForm.category}
                        onChange={(e) =>
                          setNewTipForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      >
                        <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                        <option value="Komunikasi Asertif">Komunikasi Asertif</option>
                        <option value="Kepercayaan Diri">Kepercayaan Diri</option>
                        <option value="Pencegahan Bullying">Pencegahan Bullying</option>
                        <option value="Bimbingan Sosial Umum">Bimbingan Sosial Umum</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Judul Tips
                      </label>
                      <input
                        type="text"
                        required
                        value={newTipForm.title}
                        onChange={(e) =>
                          setNewTipForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Contoh: Mengatur Napas Saat Tegang"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Deskripsi / Panduan Praktis
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={newTipForm.description}
                        onChange={(e) =>
                          setNewTipForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Tuliskan uraian tips praktis yang ringkas dan mudah dipahami oleh siswa..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Simpan Tips Baru</span>
                    </button>
                  </form>
                </div>

                {/* List Tips Tersedia (Col 2-3) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-[#163A5F]">
                      Daftar Tips Aktif ({contentData.tips.length})
                    </span>
                    <span className="text-xs text-[#6B8BA4]">
                      Tampil di halaman Fitur Lainnya &gt; Tips Sosial
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contentData.tips.map((tip) => (
                      <div
                        key={tip.id}
                        className="bg-white border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="bg-[#E6F1FC] text-[#1E5FA8] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                              {tip.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTip(tip.id, tip.title)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Hapus Tips"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                            {tip.title}
                          </h4>
                          <p className="text-xs text-[#4A6382] mt-1 leading-relaxed">
                            {tip.description}
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {tip.id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SUB-TAB 2: ARTIKEL INFORMASI                                  */}
            {/* ------------------------------------------------------------- */}
            {contentTab === 'articles' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Tambah Artikel (Col 1) */}
                <div className="lg:col-span-1 bg-white border border-[#C5DDF6] rounded-3xl p-6 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-[#163A5F]">
                    <Plus size={18} className="text-[#1E5FA8]" />
                    <span>Terbitkan Artikel Baru</span>
                  </div>

                  <form onSubmit={handleAddArticle} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Kategori Artikel
                      </label>
                      <select
                        value={newArticleForm.category}
                        onChange={(e) =>
                          setNewArticleForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      >
                        <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                        <option value="Komunikasi Asertif">Komunikasi Asertif</option>
                        <option value="Kepercayaan Diri">Kepercayaan Diri</option>
                        <option value="Pencegahan Bullying">Pencegahan Bullying</option>
                        <option value="Psikologi Remaja">Psikologi Remaja</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Judul Artikel
                      </label>
                      <input
                        type="text"
                        required
                        value={newArticleForm.title}
                        onChange={(e) =>
                          setNewArticleForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Contoh: Mengatasi Rasa Canggung Berbicara di Depan Umum"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Estimasi Waktu Baca
                      </label>
                      <input
                        type="text"
                        value={newArticleForm.readTime}
                        onChange={(e) =>
                          setNewArticleForm((prev) => ({ ...prev, readTime: e.target.value }))
                        }
                        placeholder="3 menit"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Ringkasan Singkat (Excerpt)
                      </label>
                      <textarea
                        rows={2}
                        value={newArticleForm.excerpt}
                        onChange={(e) =>
                          setNewArticleForm((prev) => ({ ...prev, excerpt: e.target.value }))
                        }
                        placeholder="Ringkasan 1-2 kalimat untuk kartu depan..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Isi Lengkap Artikel (Pisahkan Paragraf dengan Enter 2x)
                      </label>
                      <textarea
                        rows={7}
                        required
                        value={newArticleForm.content}
                        onChange={(e) =>
                          setNewArticleForm((prev) => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="Paragraf 1: Pengantar artikel...&#10;&#10;Paragraf 2: Uraian dan langkah psikologis...&#10;&#10;Paragraf 3: Kesimpulan dan dorongan semangat..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Terbitkan Artikel</span>
                    </button>
                  </form>
                </div>

                {/* List Artikel Tersedia (Col 2-3) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-[#163A5F]">
                      Daftar Artikel Tersedia ({contentData.articles.length})
                    </span>
                    <span className="text-xs text-[#6B8BA4]">
                      Dapat dibaca lengkap oleh siswa di Fitur Lainnya
                    </span>
                  </div>

                  <div className="space-y-4">
                    {contentData.articles.map((art) => (
                      <div
                        key={art.id}
                        className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#E6F1FC] text-[#1E5FA8] text-xs font-bold px-3 py-0.5 rounded-full">
                              {art.category}
                            </span>
                            <span className="text-xs text-[#6B8BA4]">
                              • {art.readTime || '3 menit'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteArticle(art.id, art.title)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                            title="Hapus Artikel"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-base sm:text-lg text-[#163A5F]">
                            {art.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-[#4A6382] mt-1 leading-relaxed">
                            {art.excerpt}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#E8F2FC] flex items-center justify-between text-xs">
                          <span className="text-[#6B8BA4]">
                            {Array.isArray(art.content) ? `${art.content.length} paragraf` : 'Artikel lengkap'}
                          </span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            ID: {art.id}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SUB-TAB 3: VIDEO EDUKASI                                      */}
            {/* ------------------------------------------------------------- */}
            {contentTab === 'videos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Tambah Video (Col 1) */}
                <div className="lg:col-span-1 bg-white border border-[#C5DDF6] rounded-3xl p-6 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-[#163A5F]">
                    <Plus size={18} className="text-[#1E5FA8]" />
                    <span>Tambah Video Edukasi Baru</span>
                  </div>

                  <form onSubmit={handleAddVideo} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Kategori Video
                      </label>
                      <select
                        value={newVideoForm.category}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      >
                        <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                        <option value="Komunikasi Asertif">Komunikasi Asertif</option>
                        <option value="Kepercayaan Diri">Kepercayaan Diri</option>
                        <option value="Pencegahan Bullying">Pencegahan Bullying</option>
                        <option value="Bimbingan Sosial Remaja">Bimbingan Sosial Remaja</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Judul Video
                      </label>
                      <input
                        type="text"
                        required
                        value={newVideoForm.title}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Contoh: 5 Cara Membangun Rasa Percaya Diri"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Link YouTube atau ID Video
                      </label>
                      <input
                        type="text"
                        required
                        value={newVideoForm.youtubeUrl}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                        }
                        placeholder="https://www.youtube.com/watch?v=... atau ID"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                      <span className="text-[11px] text-[#6B8BA4] mt-0.5 block">
                        Mendukung link lengkap YouTube atau kode 11 karakter ID.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Estimasi Durasi Video
                      </label>
                      <input
                        type="text"
                        value={newVideoForm.duration}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, duration: e.target.value }))
                        }
                        placeholder="5:20"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Deskripsi Singkat Video
                      </label>
                      <textarea
                        rows={3}
                        value={newVideoForm.description}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Jelaskan isi pokok video bimbingan ini..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#4A6382] mb-1">
                        Poin Penting Video (Satu Poin per Baris)
                      </label>
                      <textarea
                        rows={4}
                        value={newVideoForm.keyTakeaways}
                        onChange={(e) =>
                          setNewVideoForm((prev) => ({ ...prev, keyTakeaways: e.target.value }))
                        }
                        placeholder="Poin 1: Asertif berarti jujur tanpa menyakiti teman&#10;Poin 2: Gunakan formula I-Message&#10;Poin 3: Jaga kontak mata yang ramah"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Simpan Video Edukasi</span>
                    </button>
                  </form>
                </div>

                {/* List Video Tersedia (Col 2-3) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-[#163A5F]">
                      Daftar Video Tersedia ({contentData.videos.length})
                    </span>
                    <span className="text-xs text-[#6B8BA4]">
                      Bisa ditonton langsung oleh siswa di menu Video Edukasi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contentData.videos.map((vid) => (
                      <div
                        key={vid.id}
                        className="bg-white border border-[#C5DDF6] rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          {/* Mini Video Preview / Iframe */}
                          <div className="relative pb-[56.25%] bg-black">
                            {/^[\w-]{11}$/.test(vid.youtubeId) ? (
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${vid.youtubeId}`}
                                title={vid.title}
                                className="absolute inset-0 w-full h-full"
                                allowFullScreen
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
                                ID YouTube tidak valid
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="bg-[#E6F1FC] text-[#1E5FA8] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                {vid.category}
                              </span>
                              <span className="text-xs text-[#6B8BA4]">
                                ⏱️ {vid.duration || '5:00'}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F] leading-snug">
                              {vid.title}
                            </h4>

                            <p className="text-xs text-[#4A6382] line-clamp-2">
                              {vid.description}
                            </p>

                            {Array.isArray(vid.keyTakeaways) && vid.keyTakeaways.length > 0 && (
                              <div className="pt-2 border-t border-[#F0F7FF]">
                                <span className="text-[11px] font-bold text-[#1E5FA8] block mb-1">
                                  Poin Penting:
                                </span>
                                <ul className="text-xs text-[#2B4C6F] space-y-1">
                                  {vid.keyTakeaways.slice(0, 2).map((pt, pIdx) => (
                                    <li key={pIdx} className="truncate">
                                      • {pt}
                                    </li>
                                  ))}
                                  {vid.keyTakeaways.length > 2 && (
                                    <li className="text-[10px] text-slate-400">
                                      +{vid.keyTakeaways.length - 2} poin lainnya
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex items-center justify-between border-t border-[#F0F7FF] mt-2">
                          <span className="font-mono text-slate-400 text-[10px]">
                            ID: {vid.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(vid.id, vid.title)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 7: PEMBELAJARAN AI & FOTO REFERENSI KONSELING                  */}
        {/* =================================================================== */}
        {activeTab === 'learning_photos' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white border border-[#C5DDF6] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <Brain size={24} />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#163A5F]">
                    Pembelajaran Berkelanjutan AI & Foto Referensi
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#4A6382] mt-1.5 leading-relaxed max-w-2xl">
                  AI SociaCare belajar secara otomatis dari pola percakapan siswa dan menyimpannya ke database untuk diterapkan secara general ke seluruh pengguna. Admin juga dapat mengunggah foto referensi konseling agar AI dapat mengirimkannya ke siswa sebagai kartu edukasi visual.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadPhotos();
                    loadMemories();
                  }}
                  disabled={loadingPhotos || loadingMemories}
                  className="bg-[#EBF4FD] hover:bg-[#DCEBFA] text-[#1E5FA8] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 cursor-pointer border border-[#C5DDF6]"
                >
                  <RefreshCw
                    size={15}
                    className={loadingPhotos || loadingMemories ? 'animate-spin' : ''}
                  />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>

            {/* Live Clock & Calendar Indicator Banner */}
            <div className="bg-gradient-to-r from-[#102A45] via-[#163A5F] to-[#1E5FA8] text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-sky-200">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">
                    Akses Waktu & Kalender Real-Time AI
                  </div>
                  <div className="text-sm sm:text-base font-extrabold">
                    {new Intl.DateTimeFormat('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date())}
                    {' • '}
                    {new Intl.DateTimeFormat('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date())}{' '}
                    WIB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs bg-white/10 px-4 py-2 rounded-xl backdrop-blur-xs">
                <Calendar size={16} className="text-sky-300" />
                <span className="text-slate-200">
                  AI mengenali konteks jam belajar, istirahat, dan waktu siswa saat konseling berlangsung.
                </span>
              </div>
            </div>

            {/* Sub-Tab Switcher */}
            <div className="flex items-center gap-2 p-1.5 bg-[#E8F2FC] rounded-2xl max-w-fit border border-[#C5DDF6]">
              <button
                type="button"
                onClick={() => setLearningTab('photos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  learningTab === 'photos'
                    ? 'bg-[#1E5FA8] text-white shadow-xs'
                    : 'text-[#163A5F] hover:bg-white/60'
                }`}
              >
                <Image size={16} />
                <span>Foto Referensi Konseling</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    learningTab === 'photos'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#D2E4F7] text-[#1E5FA8]'
                  }`}
                >
                  {photosList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLearningTab('memories')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  learningTab === 'memories'
                    ? 'bg-[#1E5FA8] text-white shadow-xs'
                    : 'text-[#163A5F] hover:bg-white/60'
                }`}
              >
                <Brain size={16} />
                <span>Memori Pembelajaran AI</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    learningTab === 'memories'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#D2E4F7] text-[#1E5FA8]'
                  }`}
                >
                  {memoriesList.length}
                </span>
              </button>
            </div>

            {/* ============================================================== */}
            {/* SUB-TAB 1: FOTO REFERENSI KONSELING                            */}
            {/* ============================================================== */}
            {learningTab === 'photos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Upload Foto (Col 1) */}
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-sm sm:text-base border-b border-[#F0F7FF] pb-3">
                    <UploadCloud size={18} className="text-[#1E5FA8]" />
                    <span>Upload Foto Referensi Baru</span>
                  </div>

                  <form onSubmit={handleAddPhoto} className="space-y-3.5 text-xs sm:text-sm">
                    {/* Drag / File Picker */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Pilih Gambar Foto dari Perangkat:
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoFileSelect}
                        className="w-full text-xs text-[#163A5F] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-[#E8F2FC] file:text-[#1E5FA8] hover:file:bg-[#D2E4F7] file:cursor-pointer cursor-pointer border border-[#C5DDF6] rounded-xl p-2 bg-[#F4F9FF]"
                      />
                    </div>

                    {photoForm.preview && (
                      <div className="relative rounded-xl overflow-hidden border border-[#C5DDF6] bg-slate-900 max-h-48 flex items-center justify-center">
                        <img
                          src={photoForm.preview}
                          alt="Preview Upload"
                          className="max-h-44 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoForm((prev) => ({
                              ...prev,
                              base64Data: '',
                              preview: '',
                            }))
                          }
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg text-xs"
                          title="Hapus gambar pilihan"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Atau Gunakan URL External */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Atau Gunakan URL Gambar:
                      </label>
                      <input
                        type="url"
                        value={photoForm.fileUrl}
                        onChange={(e) =>
                          setPhotoForm((prev) => ({ ...prev, fileUrl: e.target.value }))
                        }
                        placeholder="https://... atau biarkan kosong jika upload file"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    {/* Judul Foto */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Judul Foto / Infografis Referensi *
                      </label>
                      <input
                        type="text"
                        required
                        value={photoForm.title}
                        onChange={(e) =>
                          setPhotoForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Contoh: Diagram Komunikasi Asertif"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    {/* Kategori */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Kategori Konseling
                      </label>
                      <select
                        value={photoForm.category}
                        onChange={(e) =>
                          setPhotoForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      >
                        <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                        <option value="Komunikasi Efektif">Komunikasi Efektif</option>
                        <option value="Kepercayaan Diri">Kepercayaan Diri</option>
                        <option value="Mencegah Bullying">Mencegah Bullying</option>
                        <option value="Bimbingan Konseling Umum">Bimbingan Konseling Umum</option>
                      </select>
                    </div>

                    {/* Deskripsi Materi untuk AI */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Materi Edukasi yang Dipelajari AI dari Foto Ini:
                      </label>
                      <textarea
                        rows={3}
                        value={photoForm.description}
                        onChange={(e) =>
                          setPhotoForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Jelaskan isi pesan foto agar AI memahami kapan foto ini harus dikirimkan dan cara menjelaskannya ke siswa..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingPhoto}
                      className="w-full bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {uploadingPhoto ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Mengunggah Foto Referensi...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span>Simpan & Upload Foto Referensi</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Grid Katalog Foto (Col 2-3) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-[#163A5F]">
                      Katalog Foto Referensi Tersedia ({photosList.length})
                    </span>
                    <span className="text-xs text-[#6B8BA4]">
                      AI dapat mengirimkan kartu foto ini langsung ke ruang chat siswa
                    </span>
                  </div>

                  {photosList.length === 0 ? (
                    <div className="bg-white border border-[#C5DDF6] rounded-2xl p-8 text-center text-slate-400 text-xs sm:text-sm">
                      Belum ada foto referensi yang diunggah. Unggah foto pertamamu melalui formulir di sebelah kiri.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {photosList.map((photo) => (
                        <div
                          key={photo.id}
                          className="bg-white border border-[#C5DDF6] rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between transition hover:shadow-md"
                        >
                          <div>
                            {/* Gambar Preview dengan Button Zoom */}
                            <div className="relative pb-[58%] bg-slate-900 group">
                              <img
                                src={photo.file_url}
                                alt={photo.title}
                                className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src =
                                    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80';
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setZoomPhoto(photo)}
                                className="absolute bottom-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-xs transition cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>Lihat Penuh</span>
                              </button>
                            </div>

                            <div className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="bg-[#E6F1FC] text-[#1E5FA8] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                  {photo.category}
                                </span>
                                <span className="font-mono text-slate-400 text-[10px]">
                                  {photo.id}
                                </span>
                              </div>

                              <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F] leading-snug">
                                {photo.title}
                              </h4>

                              <p className="text-xs text-[#4A6382] leading-relaxed line-clamp-3">
                                {photo.description}
                              </p>

                              <div className="text-[11px] font-mono text-slate-400 truncate pt-1 border-t border-[#F0F7FF]">
                                URL: {photo.file_url}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 pt-0 flex items-center justify-between border-t border-[#F0F7FF] mt-2">
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Aktif untuk AI
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id, photo.title)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 hover:bg-red-50 px-2.5 py-1 rounded transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SUB-TAB 2: MEMORI PEMBELAJARAN AI (DATABASE LEARNING)           */}
            {/* ============================================================== */}
            {learningTab === 'memories' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Tambah Memori Manual (Col 1) */}
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-sm sm:text-base border-b border-[#F0F7FF] pb-3">
                    <Brain size={18} className="text-purple-600" />
                    <span>Tambah Memori Pembelajaran Manual</span>
                  </div>

                  <form onSubmit={handleAddMemory} className="space-y-3.5 text-xs sm:text-sm">
                    {/* Topik */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Topik Bimbingan
                      </label>
                      <select
                        value={memoryForm.topicId}
                        onChange={(e) =>
                          setMemoryForm((prev) => ({ ...prev, topicId: e.target.value }))
                        }
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      >
                        <option value="general">Umum (Berlaku untuk Semua Topik)</option>
                        <option value="friendship">Hubungan Pertemanan yang Tidak Sehat</option>
                        <option value="communication">Komunikasi Efektif</option>
                        <option value="confidence">Kepercayaan Diri</option>
                        <option value="bullying">Mencegah Bullying</option>
                      </select>
                    </div>

                    {/* Kategori */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Kategori Masalah
                      </label>
                      <input
                        type="text"
                        value={memoryForm.category}
                        onChange={(e) =>
                          setMemoryForm((prev) => ({ ...prev, category: e.target.value }))
                        }
                        placeholder="Contoh: Pola Penolakan Teman Sebaya"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    {/* Pola Pertanyaan / Keluhan Siswa */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Pola Masalah / Keluhan Siswa *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={memoryForm.queryPattern}
                        onChange={(e) =>
                          setMemoryForm((prev) => ({ ...prev, queryPattern: e.target.value }))
                        }
                        placeholder="Contoh: Siswa dijauhi teman sekelompok karena tidak mau ikut mencontek saat ujian..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    {/* Wawasan Solusi Terpelajar */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Solusi / Wawasan yang Dipelajari AI *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={memoryForm.learnedInsight}
                        onChange={(e) =>
                          setMemoryForm((prev) => ({
                            ...prev,
                            learnedInsight: e.target.value,
                          }))
                        }
                        placeholder="Tuliskan respon konseling terbaik yang harus diingat AI saat menghadapi pola masalah serupa..."
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    {/* Catatan Kunci */}
                    <div>
                      <label className="block text-xs font-bold text-[#184B78] mb-1">
                        Poin Kunci / Takeaway
                      </label>
                      <input
                        type="text"
                        value={memoryForm.keyTakeaway}
                        onChange={(e) =>
                          setMemoryForm((prev) => ({ ...prev, keyTakeaway: e.target.value }))
                        }
                        placeholder="Contoh: Kuatkan integritas moral siswa & validasi emosi"
                        className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-extrabold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Plus size={16} />
                      <span>Simpan ke Database Memori AI</span>
                    </button>
                  </form>
                </div>

                {/* List Memori Pembelajaran Terpelihara (Col 2-3) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#163A5F]">
                        Database Memori Terpelihara ({memoriesList.length})
                      </span>
                      <p className="text-xs text-[#6B8BA4]">
                        Termasuk hasil auto-learning dari sesi nyata siswa & input manual Guru BK
                      </p>
                    </div>
                  </div>

                  {memoriesList.length === 0 ? (
                    <div className="bg-white border border-[#C5DDF6] rounded-2xl p-8 text-center text-slate-400 text-xs sm:text-sm">
                      Belum ada memori pembelajaran yang tersimpan di database.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memoriesList.map((mem) => (
                        <div
                          key={mem.id}
                          className="bg-white border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5 hover:border-purple-300 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                {mem.category || 'Pembelajaran AI'}
                              </span>
                              <span className="bg-[#E6F1FC] text-[#1E5FA8] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Topik: {mem.topic_id}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMemory(mem.id, mem.query_pattern)}
                              className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition cursor-pointer"
                              title="Hapus memori ini"
                            >
                              <Trash2 size={13} />
                              <span>Hapus</span>
                            </button>
                          </div>

                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Pola Pertanyaan / Masalah Siswa:
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-[#163A5F]">
                              "{mem.query_pattern}"
                            </div>
                          </div>

                          <div className="bg-[#F8FBFF] p-3 rounded-xl border border-[#E2EEF9]">
                            <div className="text-[11px] font-bold text-[#1E5FA8] uppercase tracking-wider mb-1">
                              Wawasan Solusi yang Dipelajari AI:
                            </div>
                            <div className="text-xs sm:text-sm text-[#2B4C6F] leading-relaxed">
                              {mem.learned_insight}
                            </div>
                            {mem.key_takeaway && (
                              <div className="mt-2 text-xs font-semibold text-purple-700 pt-2 border-t border-[#E2EEF9]">
                                💡 Kunci: {mem.key_takeaway}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span>
                              {mem.source_session_id
                                ? `Dipelajari dari Sesi Percakapan #${mem.source_session_id}`
                                : 'Input Pembelajaran Manual oleh Guru BK'}
                            </span>
                            <span>{mem.created_at || 'Baru saja'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Lightbox Zoom Foto */}
            {zoomPhoto && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
                onClick={() => setZoomPhoto(null)}
              >
                <div
                  className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 bg-[#102A45] text-white flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-base">{zoomPhoto.title}</h3>
                      <p className="text-xs text-sky-300">{zoomPhoto.category}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomPhoto(null)}
                      className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto max-h-[60vh]">
                    <img
                      src={zoomPhoto.file_url}
                      alt={zoomPhoto.title}
                      className="max-h-[55vh] object-contain rounded-xl"
                    />
                  </div>

                  <div className="p-5 bg-white space-y-2">
                    <p className="text-xs sm:text-sm text-[#243B55]">
                      {zoomPhoto.description}
                    </p>
                    <div className="text-xs font-mono text-slate-400">
                      File Path / URL: {zoomPhoto.file_url}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
