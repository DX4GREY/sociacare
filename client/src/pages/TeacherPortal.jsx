import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SociaHeartLogo, StudentAvatar } from '../components/Illustrations';
import {
  GraduationCap,
  ShieldAlert,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  Eye,
  RefreshCw,
  LogOut,
  ArrowLeft,
  X,
  Plus,
  Send,
  Image as ImageIcon,
  BookOpen,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
  FileText,
  Video,
  Edit3,
  Trash2,
  Play,
  Tv,
  Sparkles,
} from 'lucide-react';

export default function TeacherPortal() {
  const navigate = useNavigate();
  const [teacherToken, setTeacherToken] = useState(
    () => localStorage.getItem('sociacare_teacher_token') || ''
  );
  const [teacherUsername, setTeacherUsername] = useState(
    () => localStorage.getItem('sociacare_teacher_username') || ''
  );

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Active Tab: 'emergency' | 'students' | 'requests' | 'articles' | 'videos' | 'resources'
  const [activeTab, setActiveTab] = useState('emergency');
  const [bannerMsg, setBannerMsg] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [counselorRequests, setCounselorRequests] = useState([]);
  const [contentArticles, setContentArticles] = useState([]);
  const [contentVideos, setContentVideos] = useState([]);
  const [referencePhotos, setReferencePhotos] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'emergency' | 'active'
  const [requestFilter, setRequestFilter] = useState('all'); // 'all' | 'pending' | 'scheduled' | 'completed'

  // Inspect student chat transcript modal state
  const [inspectStudent, setInspectStudent] = useState(null);
  const [studentSessions, setStudentSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Initialize emergency modal state
  const [showInitEmergencyModal, setShowInitEmergencyModal] = useState(false);
  const [emergencyTargetUserId, setEmergencyTargetUserId] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyWarning, setEmergencyWarning] = useState('');
  const [submittingEmergency, setSubmittingEmergency] = useState(false);

  // Respond to counselor request modal state
  const [requestModal, setRequestModal] = useState({
    show: false,
    request: null,
    status: 'Disetujui / Dijadwalkan',
    scheduledTime: '',
    counselorReply: '',
  });
  const [savingRequest, setSavingRequest] = useState(false);

  // Articles state & modal
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCategoryFilter, setArticleCategoryFilter] = useState('all');
  const [articleModal, setArticleModal] = useState({
    show: false,
    mode: 'create', // 'create' | 'edit'
    id: '',
    category: 'Hubungan Pertemanan',
    title: '',
    readTime: '3 menit',
    excerpt: '',
    content: '',
  });
  const [savingArticle, setSavingArticle] = useState(false);

  // Videos state & modal
  const [videoSearch, setVideoSearch] = useState('');
  const [videoCategoryFilter, setVideoCategoryFilter] = useState('all');
  const [videoModal, setVideoModal] = useState({
    show: false,
    mode: 'create', // 'create' | 'edit'
    id: '',
    category: 'Bimbingan Sosial',
    title: '',
    duration: '5:00',
    description: '',
    youtubeUrlOrId: '',
    keyTakeaways: '',
  });
  const [savingVideo, setSavingVideo] = useState(false);

  // Photo upload form state (Resources for AI)
  const [photoForm, setPhotoForm] = useState({
    title: '',
    category: 'Hubungan Pertemanan',
    description: '',
    fileUrl: '',
    base64Data: '',
    preview: '',
  });

  function showNotification(type, text) {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 4500);
  }

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-admin-token': teacherToken,
    };
  }

  useEffect(() => {
    if (teacherToken) {
      loadAllData();
    }
  }, [teacherToken]);

  async function handleTeacherLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoadingLogin(true);
    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Username atau Password Guru BK tidak sesuai.');
        return;
      }
      localStorage.setItem('sociacare_teacher_token', data.token);
      localStorage.setItem('sociacare_teacher_username', data.username || usernameInput);
      setTeacherToken(data.token);
      setTeacherUsername(data.username || usernameInput);
      setPasswordInput('');
    } catch {
      setLoginError('Gagal menghubungi server. Pastikan server aktif.');
    } finally {
      setLoadingLogin(false);
    }
  }

  function handleTeacherLogout() {
    localStorage.removeItem('sociacare_teacher_token');
    localStorage.removeItem('sociacare_teacher_username');
    setTeacherToken('');
    setTeacherUsername('');
    setStudents([]);
    setSessions([]);
    setCounselorRequests([]);
    setContentArticles([]);
    setContentVideos([]);
    setReferencePhotos([]);
  }

  async function loadAllData() {
    setLoadingData(true);
    try {
      const [usersRes, sessRes, bkRes, photosRes, extrasRes] = await Promise.all([
        fetch('/api/admin/users', { headers: authHeaders() }),
        fetch('/api/admin/sessions', { headers: authHeaders() }),
        fetch('/api/admin/counselor-requests', { headers: authHeaders() }),
        fetch('/api/admin/photos', { headers: authHeaders() }),
        fetch('/api/content/extras'),
      ]);

      if (usersRes.status === 401) {
        handleTeacherLogout();
        return;
      }

      const usersData = await usersRes.json();
      const sessData = await sessRes.json();
      const bkData = await bkRes.json();
      const photosData = await photosRes.json();
      const extrasData = await extrasRes.json();

      if (usersData.users) setStudents(usersData.users);
      if (sessData.sessions) setSessions(sessData.sessions);
      if (bkData.requests) setCounselorRequests(bkData.requests);
      if (photosData.photos) setReferencePhotos(photosData.photos);
      if (extrasData.articles) setContentArticles(extrasData.articles);
      if (extrasData.videos) setContentVideos(extrasData.videos);
    } catch (err) {
      console.error('Error loading teacher data:', err);
      showNotification('error', 'Gagal memuat data portal.');
    } finally {
      setLoadingData(false);
    }
  }

  // Load chat session transcript
  async function handleOpenInspectStudent(student) {
    setInspectStudent(student);
    setSelectedSessionId(null);
    setChatMessages([]);
    setLoadingChat(true);

    try {
      const res = await fetch(`/api/admin/users/${student.id}/history`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.sessions) {
        setStudentSessions(data.sessions);
        if (data.sessions.length > 0) {
          handleSelectSession(data.sessions[0].id);
        }
      }
    } catch (err) {
      showNotification('error', 'Gagal memuat riwayat chat siswa.');
    } finally {
      setLoadingChat(false);
    }
  }

  async function handleSelectSession(sessionId) {
    setSelectedSessionId(sessionId);
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/messages`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.messages) {
        setChatMessages(data.messages);
      }
    } catch (err) {
      showNotification('error', 'Gagal memuat transkrip pesan.');
    } finally {
      setLoadingChat(false);
    }
  }

  // Handle Emergency Activation
  async function handleActivateEmergencySubmit(e) {
    e.preventDefault();
    if (!emergencyTargetUserId) {
      showNotification('error', 'Pilih siswa terlebih dahulu.');
      return;
    }
    setSubmittingEmergency(true);
    try {
      const res = await fetch(`/api/admin/users/${emergencyTargetUserId}/emergency`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          isEmergency: true,
          reason: emergencyReason || 'Kondisi ditandai darurat langsung oleh Guru BK.',
          warningAi: emergencyWarning || '',
        }),
      });
      if (res.ok) {
        const target = students.find((s) => String(s.id) === String(emergencyTargetUserId));
        showNotification(
          'success',
          `Status GAWAT DARURAT berhasil diaktifkan untuk siswa "${target?.name || 'Siswa'}".`
        );
        setShowInitEmergencyModal(false);
        setEmergencyTargetUserId('');
        setEmergencyReason('');
        setEmergencyWarning('');
        await loadAllData();
      } else {
        showNotification('error', 'Gagal memperbarui status darurat siswa.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setSubmittingEmergency(false);
    }
  }

  // Resolve Emergency
  async function handleResolveEmergency(student) {
    if (
      !window.confirm(
        `Tandai kondisi darurat siswa "${student.name}" telah ditangani oleh Guru BK dan kembali ke status normal?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${student.id}/emergency`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          isEmergency: false,
          reason: '',
          warningAi: '',
        }),
      });
      if (res.ok) {
        showNotification(
          'success',
          `Status darurat siswa "${student.name}" telah diselesaikan dan kembali normal.`
        );
        await loadAllData();
      } else {
        showNotification('error', 'Gagal menyelesaikan status darurat.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  // =========================================================================
  // COUNSELOR REQUESTS (MANUAL APPROVAL & SCHEDULING)
  // =========================================================================
  function handleOpenRequestModal(req, actionType) {
    const studentName = req.user_name || req.student_name || `Siswa #${req.user_id}`;
    let defaultStatus = 'Disetujui / Dijadwalkan';
    let defaultTime = req.preferred_schedule || 'Senin, 10:00 WIB di Ruang BK';
    let defaultReply = '';

    if (actionType === 'accept') {
      defaultStatus = 'Disetujui / Dijadwalkan';
      defaultReply = `Halo ${studentName}, permohonan bimbingan tatap muka kamu disetujui. Silakan hadir di Ruang BK pada ${defaultTime}. Jangan ragu ya, Ibu/Bapak siap mendengarkan.`;
    } else if (actionType === 'reject') {
      defaultStatus = 'Jadwal Diatur Ulang / Ditolak';
      defaultReply = `Halo ${studentName}, mohon maaf untuk waktu tersebut Guru BK sedang ada agenda dinas/rapat. Mohon hubungi langsung ruang BK atau ajukan jadwal di jam istirahat lain ya.`;
    } else if (actionType === 'complete') {
      defaultStatus = 'Selesai Konseling';
      defaultReply = req.counselor_reply || `Sesi bimbingan tatap muka telah selesai dilaksanakan di Ruang BK. Tetap semangat!`;
    }

    setRequestModal({
      show: true,
      request: req,
      status: defaultStatus,
      scheduledTime: defaultTime,
      counselorReply: req.counselor_reply || defaultReply,
    });
  }

  async function handleSaveRequestSubmit(e) {
    e.preventDefault();
    if (!requestModal.request) return;
    setSavingRequest(true);
    try {
      const res = await fetch(`/api/admin/counselor-requests/${requestModal.request.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          status: requestModal.status,
          counselorReply: requestModal.counselorReply,
        }),
      });
      if (res.ok) {
        showNotification('success', 'Tanggapan & status bimbingan tatap muka berhasil disimpan!');
        setRequestModal({ show: false, request: null, status: '', scheduledTime: '', counselorReply: '' });
        await loadAllData();
      } else {
        showNotification('error', 'Gagal memperbarui permohonan bimbingan.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setSavingRequest(false);
    }
  }

  async function handleDeleteRequest(reqId) {
    if (!window.confirm('Hapus permohonan konseling ini dari daftar?')) return;
    try {
      const res = await fetch(`/api/admin/counselor-requests/${reqId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Permohonan bimbingan berhasil dihapus.');
        await loadAllData();
      } else {
        showNotification('error', 'Gagal menghapus permohonan.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  // =========================================================================
  // ARTIKEL KONSELING (TAMBAH, EDIT, HAPUS)
  // =========================================================================
  function handleOpenArticleModal(mode, art = null) {
    if (mode === 'edit' && art) {
      const contentStr = Array.isArray(art.content)
        ? art.content.join('\n\n')
        : (art.content || art.excerpt || '');
      setArticleModal({
        show: true,
        mode: 'edit',
        id: art.id,
        category: art.category || 'Hubungan Pertemanan',
        title: art.title || '',
        readTime: art.readTime || '3 menit',
        excerpt: art.excerpt || '',
        content: contentStr,
      });
    } else {
      setArticleModal({
        show: true,
        mode: 'create',
        id: '',
        category: 'Hubungan Pertemanan',
        title: '',
        readTime: '3 menit',
        excerpt: '',
        content: '',
      });
    }
  }

  async function handleSaveArticleSubmit(e) {
    e.preventDefault();
    if (!articleModal.title.trim() || !articleModal.content.trim()) {
      showNotification('error', 'Judul dan isi konten artikel wajib diisi.');
      return;
    }
    setSavingArticle(true);
    try {
      const endpoint =
        articleModal.mode === 'edit'
          ? `/api/admin/content/articles/${encodeURIComponent(articleModal.id)}`
          : '/api/admin/content/articles';
      const method = articleModal.mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          category: articleModal.category,
          title: articleModal.title,
          readTime: articleModal.readTime,
          excerpt: articleModal.excerpt,
          content: articleModal.content,
        }),
      });

      if (res.ok) {
        showNotification(
          'success',
          articleModal.mode === 'edit'
            ? 'Artikel konseling berhasil diperbarui!'
            : 'Artikel konseling baru berhasil diterbitkan!'
        );
        setArticleModal((prev) => ({ ...prev, show: false }));
        await loadAllData();
      } else {
        const d = await res.json().catch(() => ({}));
        showNotification('error', d.error || 'Gagal menyimpan artikel.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setSavingArticle(false);
    }
  }

  async function handleDeleteArticle(artId, title) {
    if (!window.confirm(`Yakin ingin menghapus artikel "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/articles/${encodeURIComponent(artId)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showNotification('success', `Artikel "${title}" berhasil dihapus.`);
        await loadAllData();
      } else {
        showNotification('error', 'Gagal menghapus artikel.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  // =========================================================================
  // VIDEO EDUKASI (TAMBAH, EDIT, HAPUS)
  // =========================================================================
  function extractYoutubeId(input) {
    if (!input) return '';
    const str = String(input).trim();
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) return match[1];
    if (/^[\w-]{11}$/.test(str)) return str;
    return str;
  }

  function handleOpenVideoModal(mode, vid = null) {
    if (mode === 'edit' && vid) {
      const takeawaysStr = Array.isArray(vid.keyTakeaways)
        ? vid.keyTakeaways.join('\n')
        : (vid.keyTakeaways || '');
      setVideoModal({
        show: true,
        mode: 'edit',
        id: vid.id,
        category: vid.category || 'Bimbingan Sosial',
        title: vid.title || '',
        duration: vid.duration || '5:00',
        description: vid.description || '',
        youtubeUrlOrId: vid.youtubeId ? `https://www.youtube.com/watch?v=${vid.youtubeId}` : '',
        keyTakeaways: takeawaysStr,
      });
    } else {
      setVideoModal({
        show: true,
        mode: 'create',
        id: '',
        category: 'Bimbingan Sosial',
        title: '',
        duration: '5:00',
        description: '',
        youtubeUrlOrId: '',
        keyTakeaways: '',
      });
    }
  }

  async function handleSaveVideoSubmit(e) {
    e.preventDefault();
    if (!videoModal.title.trim() || !videoModal.youtubeUrlOrId.trim()) {
      showNotification('error', 'Judul dan link/ID YouTube video wajib diisi.');
      return;
    }
    setSavingVideo(true);
    try {
      const endpoint =
        videoModal.mode === 'edit'
          ? `/api/admin/content/videos/${encodeURIComponent(videoModal.id)}`
          : '/api/admin/content/videos';
      const method = videoModal.mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          category: videoModal.category,
          title: videoModal.title,
          duration: videoModal.duration,
          description: videoModal.description,
          youtubeUrlOrId: videoModal.youtubeUrlOrId,
          keyTakeaways: videoModal.keyTakeaways,
        }),
      });

      if (res.ok) {
        showNotification(
          'success',
          videoModal.mode === 'edit'
            ? 'Video edukasi berhasil diperbarui!'
            : 'Video edukasi baru berhasil ditambahkan!'
        );
        setVideoModal((prev) => ({ ...prev, show: false }));
        await loadAllData();
      } else {
        const d = await res.json().catch(() => ({}));
        showNotification('error', d.error || 'Gagal menyimpan video.');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleDeleteVideo(vidId, title) {
    if (!window.confirm(`Yakin ingin menghapus video "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/content/videos/${encodeURIComponent(vidId)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showNotification('success', `Video "${title}" berhasil dihapus.`);
        await loadAllData();
      } else {
        showNotification('error', 'Gagal menghapus video.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  // =========================================================================
  // MATERI FOTO EDUKASI AI
  // =========================================================================
  function handlePhotoFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('error', 'File harus berupa gambar (JPG, PNG, WebP).');
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

  async function handleAddPhotoSubmit(e) {
    e.preventDefault();
    if (!photoForm.title.trim()) {
      showNotification('error', 'Judul foto referensi wajib diisi.');
      return;
    }
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(photoForm),
      });
      if (res.ok) {
        showNotification('success', 'Materi foto referensi konseling berhasil ditambahkan!');
        setPhotoForm({
          title: '',
          category: 'Hubungan Pertemanan',
          description: '',
          fileUrl: '',
          base64Data: '',
          preview: '',
        });
        await loadAllData();
      } else {
        showNotification('error', 'Gagal mengunggah foto.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  async function handleDeletePhoto(photoId, title) {
    if (!window.confirm(`Hapus foto referensi "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        showNotification('success', 'Foto referensi berhasil dihapus.');
        await loadAllData();
      } else {
        showNotification('error', 'Gagal menghapus foto.');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  }

  // Filter students list
  const emergencyStudents = students.filter((s) => Number(s.is_emergency) === 1);
  const emergencyCount = emergencyStudents.length;

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase().trim();
    const matchName = !q || s.name?.toLowerCase().includes(q) || String(s.id).includes(q) || s.class_name?.toLowerCase().includes(q);
    if (!matchName) return false;
    if (filterMode === 'emergency') return Number(s.is_emergency) === 1;
    if (filterMode === 'active') return Number(s.session_count) > 0;
    return true;
  });

  // Filter requests
  const pendingRequestsCount = counselorRequests.filter(
    (r) => !r.status || r.status.toLowerCase().includes('menunggu') || r.status === 'pending'
  ).length;

  const filteredRequests = counselorRequests.filter((r) => {
    if (requestFilter === 'pending') {
      return !r.status || r.status.toLowerCase().includes('menunggu') || r.status === 'pending';
    }
    if (requestFilter === 'scheduled') {
      return r.status?.toLowerCase().includes('disetujui') || r.status === 'scheduled';
    }
    if (requestFilter === 'completed') {
      return r.status?.toLowerCase().includes('selesai') || r.status === 'completed';
    }
    return true;
  });

  // Filter articles
  const filteredArticles = contentArticles.filter((art) => {
    const q = articleSearch.toLowerCase().trim();
    const matchQ = !q || art.title?.toLowerCase().includes(q) || art.category?.toLowerCase().includes(q) || art.excerpt?.toLowerCase().includes(q);
    const matchCat = articleCategoryFilter === 'all' || art.category === articleCategoryFilter;
    return matchQ && matchCat;
  });

  // Filter videos
  const filteredVideos = contentVideos.filter((vid) => {
    const q = videoSearch.toLowerCase().trim();
    const matchQ = !q || vid.title?.toLowerCase().includes(q) || vid.category?.toLowerCase().includes(q) || vid.description?.toLowerCase().includes(q);
    const matchCat = videoCategoryFilter === 'all' || vid.category === videoCategoryFilter;
    return matchQ && matchCat;
  });

  // =========================================================================
  // LOGIN SCREEN (KHUSUS GURU BK)
  // =========================================================================
  if (!teacherToken) {
    return (
      <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#0B2545] via-[#133E6E] to-[#1E5FA8] flex items-center justify-center p-5 text-white">
        <div className="w-full max-w-md bg-white text-[#1E2F47] rounded-3xl p-7 sm:p-9 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8F2FC] pb-4">
            <div className="flex items-center gap-3">
              <SociaHeartLogo size={42} />
              <div>
                <h1 className="font-extrabold text-xl text-[#163A5F]">
                  Portal Guru BK
                </h1>
                <p className="text-xs text-[#4A6382] font-semibold">
                  Bimbingan Konseling & Pendampingan Siswa
                </p>
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#E8F2FC] text-[#1E5FA8]">
              <GraduationCap size={26} />
            </div>
          </div>

          <p className="text-xs text-[#4A6382] leading-relaxed">
            Halaman khusus untuk Guru Bimbingan Konseling (BK) memantau kondisi siswa, meninjau permohonan tatap muka manual, mengelola artikel bacaan & video edukasi, serta menangani situasi darurat siswa. Akun dibuat dan dikelola langsung oleh Administrator.
          </p>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3.5 rounded-xl">
              {loginError}
            </div>
          )}

          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                Username Guru BK
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Masukkan username Guru BK"
                className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-4 py-3 text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                Password Guru BK
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password Guru BK"
                className="w-full bg-[#F4F9FF] border border-[#C2DCF5] rounded-xl px-4 py-3 text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-60 text-white font-bold text-sm py-3.5 rounded-full shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <GraduationCap size={18} />
              <span>{loadingLogin ? 'Memverifikasi...' : 'Masuk ke Ruang Guru BK'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#4A6382]">
            <span className="text-[11px] text-slate-500">Hubungi Administrator jika belum memiliki akun.</span>
            <Link
              to="/"
              className="inline-flex items-center gap-1 font-bold text-[#1E5FA8] hover:underline"
            >
              <ArrowLeft size={13} />
              Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN DASHBOARD (PORTAL GURU BK)
  // =========================================================================
  return (
    <div className="min-h-[100dvh] w-full bg-[#F2F7FC] text-[#1E2F47] flex flex-col">
      {/* Toast Notification */}
      {bannerMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all animate-bounce ${
            bannerMsg.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {bannerMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-[#C5DDF6] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
              <SociaHeartLogo size={34} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg text-[#163A5F] tracking-tight">
                    SociaCare
                  </span>
                  <span className="bg-[#EBF4FD] text-[#1E5FA8] border border-[#C5DDF6] text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <GraduationCap size={13} />
                    Portal Guru BK
                  </span>
                </div>
                <div className="text-[11px] text-[#4A6382] font-semibold hidden sm:block">
                  Sistem Bimbingan Konseling & Pemantauan Siswa
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F7FC] border border-[#C5DDF6] rounded-xl text-xs font-bold text-[#184B78]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Guru BK Aktif: <strong className="text-[#163A5F]">{teacherUsername}</strong></span>
            </div>

            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#C5DDF6] hover:bg-[#F2F7FC] text-[#184B78] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw size={15} className={loadingData ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#C5DDF6] hover:bg-[#F2F7FC] text-[#184B78] text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Halaman Siswa</span>
            </Link>

            <button
              type="button"
              onClick={handleTeacherLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Keluar dari Portal Guru BK"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* KPI OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
          <div
            onClick={() => setActiveTab('emergency')}
            className={`p-4 rounded-2xl border transition cursor-pointer ${
              emergencyCount > 0
                ? 'bg-red-50/80 border-red-300 text-red-900 shadow-xs'
                : 'bg-white border-[#C5DDF6] text-[#163A5F]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Kondisi Darurat</span>
              <span className={`p-1.5 rounded-xl ${emergencyCount > 0 ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                <ShieldAlert size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold mt-1">
              {emergencyCount}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              {emergencyCount > 0 ? 'Perlu tindakan segera!' : 'Kondisi aman'}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('students')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Total Siswa</span>
              <span className="p-1.5 rounded-xl bg-[#E8F2FC] text-[#1E5FA8]">
                <Users size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-1">
              {students.length}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              Siswa terdaftar
            </div>
          </div>

          <div
            onClick={() => setActiveTab('students')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Obrolan AI</span>
              <span className="p-1.5 rounded-xl bg-[#E8F2FC] text-[#1E5FA8]">
                <MessageSquare size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-1">
              {sessions.length}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              Sesi konseling AI
            </div>
          </div>

          <div
            onClick={() => setActiveTab('requests')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Tatap Muka</span>
              <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <GraduationCap size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-1">
              {counselorRequests.length}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              <span className={pendingRequestsCount > 0 ? 'text-amber-600 font-extrabold' : ''}>
                {pendingRequestsCount} menunggu respon
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('articles')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Artikel BK</span>
              <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileText size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-1">
              {contentArticles.length}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              Artikel edukasi bacaan
            </div>
          </div>

          <div
            onClick={() => setActiveTab('videos')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Video Edukasi</span>
              <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <Video size={16} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-1">
              {contentVideos.length}
            </div>
            <div className="text-[10px] text-[#4A6382] mt-0.5 font-semibold">
              Video konseling siswa
            </div>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-[#E2EDF9] rounded-2xl max-w-fit border border-[#C5DDF6] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'emergency'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <ShieldAlert size={16} />
            <span>Pusat Darurat</span>
            {emergencyCount > 0 && (
              <span className="bg-white text-red-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {emergencyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <Users size={16} />
            <span>Aktivitas & Chat Siswa</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <GraduationCap size={16} />
            <span>Permintaan Tatap Muka</span>
            {pendingRequestsCount > 0 ? (
              <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {pendingRequestsCount}
              </span>
            ) : (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {counselorRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('articles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'articles'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <FileText size={16} />
            <span>Artikel Konseling</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {contentArticles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <Video size={16} />
            <span>Video Edukasi</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {contentVideos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <ImageIcon size={16} />
            <span>Foto & Referensi AI</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {referencePhotos.length}
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: PUSAT GAWAT DARURAT                                         */}
        {/* =================================================================== */}
        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#C5DDF6] rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-red-100 text-red-700">
                    <ShieldAlert size={24} />
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#163A5F]">
                    Pusat Penanganan Gawat Darurat Siswa
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#4A6382] mt-1.5 max-w-2xl leading-relaxed">
                  Fitur ini dirancang khusus untuk mendeteksi atau mengaktifkan status intervensi langsung Guru BK pada siswa yang mengalami indikasi bullying berat, kecemasan akut, atau ancaman keselamatan emosional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInitEmergencyModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus size={18} />
                <span>Inisialisasi Kondisi Darurat Siswa</span>
              </button>
            </div>

            {/* List of active emergency students */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm sm:text-base text-[#163A5F] flex items-center gap-2">
                  <span>Daftar Siswa Dalam Kondisi Darurat Aktif</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700">
                    {emergencyCount}
                  </span>
                </h3>
              </div>

              {emergencyStudents.length === 0 ? (
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-8 sm:p-12 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-extrabold text-base text-[#163A5F]">
                    Tidak Ada Siswa Dalam Kondisi Darurat
                  </h4>
                  <p className="text-xs text-[#4A6382] max-w-md mx-auto">
                    Seluruh aktivitas obrolan siswa saat ini berada dalam koridor aman. Guru BK dapat memantau riwayat obrolan secara berkala di tab "Aktivitas & Chat Siswa".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emergencyStudents.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border-2 border-red-300 rounded-3xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar avatarIndex={st.avatar_index || 0} size={46} />
                          <div>
                            <div className="font-extrabold text-base text-[#163A5F] flex items-center gap-2">
                              <span>{st.name}</span>
                              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                                DARURAT
                              </span>
                            </div>
                            <div className="text-xs text-[#4A6382] font-semibold">
                              Kelas: {st.class_name || 'Umum'} • ID #{st.id}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenInspectStudent(st)}
                          className="p-2 rounded-xl bg-[#E8F2FC] text-[#1E5FA8] hover:bg-[#D5E8FA] transition cursor-pointer text-xs font-bold flex items-center gap-1"
                          title="Periksa Chat Lengkap"
                        >
                          <Eye size={15} />
                          <span className="hidden sm:inline">Lihat Chat</span>
                        </button>
                      </div>

                      <div className="bg-red-50/70 border border-red-200 rounded-2xl p-3.5 text-xs text-red-900 space-y-1">
                        <div className="font-extrabold flex items-center gap-1.5 text-red-800">
                          <AlertTriangle size={14} />
                          <span>Penyebab / Indikasi Kedaruratan:</span>
                        </div>
                        <p className="leading-relaxed font-semibold">
                          {st.emergency_reason || 'Terdeteksi kondisi gawat darurat yang membutuhkan pendampingan segera oleh konselor.'}
                        </p>
                        {st.emergency_warning && (
                          <div className="mt-2 pt-2 border-t border-red-200/60 text-[11px] text-red-700 italic">
                            Instruksi di layar siswa: "{st.emergency_warning}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                        <div className="text-[11px] text-[#4A6382]">
                          Status diaktifkan pada: {st.updated_at || st.created_at || 'Hari ini'}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleResolveEmergency(st)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 size={14} />
                          <span>Tandai Sudah Ditangani</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: AKTIVITAS & TRANSKRIP CHAT SISWA                             */}
        {/* =================================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 max-w-md relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari nama atau kelas siswa..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#1E5FA8] text-white'
                      : 'bg-[#F2F7FC] text-[#163A5F] border border-[#C5DDF6]'
                  }`}
                >
                  Semua ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('emergency')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'emergency'
                      ? 'bg-red-600 text-white'
                      : 'bg-[#F2F7FC] text-red-700 border border-red-200'
                  }`}
                >
                  Darurat ({emergencyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === 'active'
                      ? 'bg-sky-600 text-white'
                      : 'bg-[#F2F7FC] text-[#163A5F] border border-[#C5DDF6]'
                  }`}
                >
                  Pernah Chat
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((st) => {
                const isEmerg = Number(st.is_emergency) === 1;
                return (
                  <div
                    key={st.id}
                    className={`bg-white rounded-2xl p-5 border transition-all space-y-3.5 ${
                      isEmerg
                        ? 'border-red-400 shadow-md ring-2 ring-red-100'
                        : 'border-[#C5DDF6] hover:border-[#1E5FA8] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StudentAvatar avatarIndex={st.avatar_index || 0} size={44} />
                        <div>
                          <div className="font-extrabold text-sm sm:text-base text-[#163A5F] flex items-center gap-1.5">
                            <span>{st.name}</span>
                            {isEmerg && (
                              <span className="text-[9px] bg-red-600 text-white px-2 py-0.2 rounded-full font-extrabold">
                                SOS
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#4A6382] font-semibold">
                            Kelas: {st.class_name || 'Umum'} • ID #{st.id}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-[#EBF4FD] text-[#184B78]">
                        {st.session_count || 0} Sesi
                      </span>
                    </div>

                    <div className="text-xs text-[#4A6382] space-y-1">
                      <div>
                        Terdaftar: <strong className="text-[#163A5F]">{st.created_at || 'Baru'}</strong>
                      </div>
                      <div>
                        Total Token Konseling: <strong className="text-[#163A5F]">{st.total_tokens ? Number(st.total_tokens).toLocaleString() : 0}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenInspectStudent(st)}
                        className="flex-1 bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>Lihat Transkrip Chat</span>
                      </button>

                      {isEmerg ? (
                        <button
                          type="button"
                          onClick={() => handleResolveEmergency(st)}
                          className="p-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition"
                          title="Selesaikan status darurat"
                        >
                          <Check size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEmergencyTargetUserId(String(st.id));
                            setShowInitEmergencyModal(true);
                          }}
                          className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Tandai kondisi darurat"
                        >
                          <ShieldAlert size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PENGAJUAN BIMBINGAN TATAP MUKA (MANUAL APPROVAL)              */}
        {/* =================================================================== */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#163A5F] flex items-center gap-2">
                  <span>Permohonan Bimbingan Tatap Muka Siswa</span>
                  <span className="text-xs bg-[#E8F2FC] text-[#1E5FA8] font-extrabold px-2.5 py-0.5 rounded-full">
                    Total: {counselorRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-[#4A6382] mt-0.5">
                  Setiap permohonan dari siswa <strong>wajib ditinjau secara manual</strong> oleh Guru BK untuk menentukan persetujuan, jadwal resmi, dan ruang konseling.
                </p>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setRequestFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestFilter === 'all'
                      ? 'bg-[#1E5FA8] text-white'
                      : 'bg-[#F2F7FC] text-[#163A5F] border border-[#C5DDF6]'
                  }`}
                >
                  Semua ({counselorRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  Menunggu Persetujuan ({pendingRequestsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('scheduled')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestFilter === 'scheduled'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  Disetujui / Dijadwalkan
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    requestFilter === 'completed'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-900 border border-sky-200'
                  }`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada pengajuan bimbingan tatap muka pada kategori ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRequests.map((req) => {
                  const studentName = req.user_name || req.student_name || `Siswa #${req.user_id}`;
                  const isPending = !req.status || req.status.toLowerCase().includes('menunggu') || req.status === 'pending';
                  const isScheduled = req.status?.toLowerCase().includes('disetujui') || req.status === 'scheduled';
                  const isCompleted = req.status?.toLowerCase().includes('selesai') || req.status === 'completed';
                  const isRejected = req.status?.toLowerCase().includes('tolak') || req.status?.toLowerCase().includes('ulang') || req.status === 'rejected';
                  const isUrgent = req.urgency?.toLowerCase() === 'darurat';

                  return (
                    <div
                      key={req.id}
                      className={`bg-white rounded-2xl p-5 shadow-2xs space-y-3.5 border transition-all ${
                        isPending
                          ? 'border-amber-300 ring-2 ring-amber-50'
                          : isScheduled
                          ? 'border-emerald-300'
                          : 'border-[#C5DDF6]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm sm:text-base text-[#163A5F] flex items-center gap-2">
                            <span>{studentName}</span>
                            {req.user_class && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                                {req.user_class}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#4A6382] mt-0.5">
                            ID Pengajuan #{req.id} • {req.created_at || 'Baru'}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              isCompleted
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : isScheduled
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isRejected
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                            }`}
                          >
                            {isCompleted
                              ? '🎓 Selesai Konseling'
                              : isScheduled
                              ? '✅ Disetujui & Dijadwalkan'
                              : isRejected
                              ? '⚠️ Ditolak / Atur Ulang'
                              : '⏳ Menunggu Persetujuan Guru BK'}
                          </span>

                          {isUrgent && (
                            <span className="text-[9px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                              🔥 SANGAT MENDESAK
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#F8FBFE] border border-[#E1EEFA] rounded-xl p-3 text-xs space-y-1.5">
                        <div>
                          <strong className="text-[#184B78]">Topik Bimbingan:</strong>{' '}
                          <span className="font-bold text-[#163A5F]">{req.topic_title || 'Konseling Tatap Muka'}</span>
                        </div>
                        <div>
                          <strong className="text-[#184B78]">Waktu Yang Diminta Siswa:</strong>{' '}
                          <span className="text-[#163A5F] font-semibold">{req.preferred_schedule || 'Jam Istirahat'}</span>
                        </div>
                        <div>
                          <strong className="text-[#184B78]">Keluhan / Pesan Siswa:</strong>
                          <p className="mt-0.5 text-[#243B55] italic whitespace-pre-line bg-white p-2 rounded-lg border border-slate-200">
                            "{req.message || req.notes || 'Tidak ada catatan tambahan.'}"
                          </p>
                        </div>
                      </div>

                      {/* Balasan Resmi Guru BK */}
                      {req.counselor_reply ? (
                        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Tanggapan & Jadwal Resmi dari Guru BK:</span>
                          </div>
                          <p className="whitespace-pre-line pl-4 text-emerald-900 font-semibold">{req.counselor_reply}</p>
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-amber-600" />
                          <span>Permohonan ini belum direspon oleh Guru BK. Siswa sedang menunggu konfirmasi jadwal darimu.</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(req.id)}
                          className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                          title="Hapus permohonan"
                        >
                          <Trash2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(req, 'reject')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          Atur Ulang / Tolak
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRequestModal(req, 'accept')}
                          className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 size={14} />
                          <span>{isScheduled ? 'Ubah Jadwal' : 'Terima & Tentukan Jadwal'}</span>
                        </button>

                        {!isCompleted && isScheduled && (
                          <button
                            type="button"
                            onClick={() => handleOpenRequestModal(req, 'complete')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                          >
                            <Check size={13} />
                            <span>Tandai Selesai</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: ARTIKEL KONSELING (TAMBAH, EDIT, HAPUS)                       */}
        {/* =================================================================== */}
        {activeTab === 'articles' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#163A5F] flex items-center gap-2">
                  <span>Manajemen Artikel Bacaan Konseling Siswa</span>
                  <span className="text-xs bg-[#E8F2FC] text-[#1E5FA8] font-extrabold px-2.5 py-0.5 rounded-full">
                    {contentArticles.length} Artikel
                  </span>
                </h3>
                <p className="text-xs text-[#4A6382] mt-0.5">
                  Guru BK dapat menulis artikel baru, mengubah isi bacaan, atau menghapus artikel yang tampil di tab "Fitur Lainnya → Artikel Edukasi" siswa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenArticleModal('create')}
                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>+ Tambah Artikel Baru</span>
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  placeholder="Cari judul artikel konseling..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#C5DDF6] rounded-xl text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['all', 'Hubungan Pertemanan', 'Mengatasi Cemas & Stres', 'Percintaan Remaja', 'Keluarga & Rumah'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setArticleCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      articleCategoryFilter === cat
                        ? 'bg-[#1E5FA8] text-white'
                        : 'bg-white border border-[#C5DDF6] text-[#184B78]'
                    }`}
                  >
                    {cat === 'all' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada artikel pada kategori ini. Klik tombol "+ Tambah Artikel Baru" untuk mulai menulis.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((art) => (
                  <div
                    key={art.id}
                    className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-3.5 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {art.category || 'Umum'}
                        </span>
                        <span className="text-[10px] text-[#4A6382] font-semibold flex items-center gap-1">
                          <Clock size={11} />
                          {art.readTime || '3 menit'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F] line-clamp-2">
                        {art.title}
                      </h4>

                      <p className="text-xs text-[#4A6382] line-clamp-3 leading-relaxed">
                        {art.excerpt || (Array.isArray(art.content) ? art.content[0] : art.content)}
                      </p>

                      {Array.isArray(art.content) && (
                        <div className="text-[11px] text-[#7B96B2] font-medium">
                          {art.content.length} Paragraf Isi
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(art.id, art.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer text-xs"
                        title="Hapus Artikel"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenArticleModal('edit', art)}
                        className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit Artikel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: VIDEO EDUKASI (TAMBAH, EDIT, HAPUS)                          */}
        {/* =================================================================== */}
        {activeTab === 'videos' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#163A5F] flex items-center gap-2">
                  <span>Manajemen Video Edukasi & Bimbingan Siswa</span>
                  <span className="text-xs bg-[#E8F2FC] text-[#1E5FA8] font-extrabold px-2.5 py-0.5 rounded-full">
                    {contentVideos.length} Video
                  </span>
                </h3>
                <p className="text-xs text-[#4A6382] mt-0.5">
                  Guru BK dapat menyematkan video YouTube edukatif, mengatur durasi & ringkasan poin inti yang dapat ditonton siswa di aplikasi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenVideoModal('create')}
                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>+ Tambah Video Baru</span>
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="Cari judul video edukasi..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#C5DDF6] rounded-xl text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['all', 'Bimbingan Sosial', 'Manajemen Emosi', 'Anti-Bullying', 'Motivasi Belajar'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setVideoCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      videoCategoryFilter === cat
                        ? 'bg-[#1E5FA8] text-white'
                        : 'bg-white border border-[#C5DDF6] text-[#184B78]'
                    }`}
                  >
                    {cat === 'all' ? 'Semua Kategori' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Videos Grid */}
            {filteredVideos.length === 0 ? (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada video pada kategori ini. Klik "+ Tambah Video Baru" untuk menyematkan link YouTube.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVideos.map((vid) => {
                  const ytId = vid.youtubeId || extractYoutubeId(vid.embedUrl);
                  return (
                    <div
                      key={vid.id}
                      className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between transition"
                    >
                      {/* Video Embed Player */}
                      <div className="w-full aspect-video bg-black relative">
                        {ytId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                            title={vid.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            Format link video tidak dikenali
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              {vid.category || 'Bimbingan Sosial'}
                            </span>
                            <span className="text-[10px] text-[#4A6382] font-semibold flex items-center gap-1">
                              <Clock size={11} />
                              {vid.duration || '5:00'}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F] line-clamp-2">
                            {vid.title}
                          </h4>

                          <p className="text-xs text-[#4A6382] line-clamp-2 leading-relaxed">
                            {vid.description}
                          </p>

                          {Array.isArray(vid.keyTakeaways) && vid.keyTakeaways.length > 0 && (
                            <div className="bg-[#F8FBFE] p-2.5 rounded-xl border border-[#E1EEFA] text-[11px] text-[#184B78] space-y-1 mt-2">
                              <span className="font-bold block">Poin Inti Pembelajaran:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-[#243B55]">
                                {vid.keyTakeaways.slice(0, 2).map((pt, idx) => (
                                  <li key={idx} className="truncate">{pt}</li>
                                ))}
                                {vid.keyTakeaways.length > 2 && (
                                  <li className="text-[#7B96B2] italic">+{vid.keyTakeaways.length - 2} poin lainnya</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(vid.id, vid.title)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer text-xs"
                            title="Hapus Video"
                          >
                            <Trash2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenVideoModal('edit', vid)}
                            className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Edit3 size={13} />
                            <span>Edit Video</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 6: MATERI & FOTO EDUKASI AI                                    */}
        {/* =================================================================== */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Upload Materi Baru */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-sm sm:text-base border-b border-[#F0F7FF] pb-3">
                <ImageIcon size={18} className="text-[#1E5FA8]" />
                <span>Upload Foto Referensi Baru untuk AI</span>
              </div>

              <form onSubmit={handleAddPhotoSubmit} className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Judul Gambar:
                  </label>
                  <input
                    type="text"
                    required
                    value={photoForm.title}
                    onChange={(e) => setPhotoForm({ ...photoForm, title: e.target.value })}
                    placeholder="Contoh: Infografis Menghadapi Bullying"
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Kategori Bimbingan:
                  </label>
                  <select
                    value={photoForm.category}
                    onChange={(e) => setPhotoForm({ ...photoForm, category: e.target.value })}
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                  >
                    <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                    <option value="Mengatasi Cemas & Stres">Mengatasi Cemas & Stres</option>
                    <option value="Percintaan Remaja">Percintaan Remaja</option>
                    <option value="Keluarga & Rumah">Keluarga & Rumah</option>
                    <option value="Motivasi Belajar">Motivasi Belajar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Deskripsi / Konteks Pembelajaran untuk AI:
                  </label>
                  <textarea
                    rows={3}
                    value={photoForm.description}
                    onChange={(e) => setPhotoForm({ ...photoForm, description: e.target.value })}
                    placeholder="Jelaskan apa isi materi ini agar model AI mengerti kapan harus merekomendasikannya ke siswa..."
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Pilih File Gambar (JPG / PNG):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileSelect}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E8F2FC] file:text-[#1E5FA8] hover:file:bg-[#D5E8FA] cursor-pointer"
                  />
                  {photoForm.preview && (
                    <div className="mt-2.5 rounded-xl overflow-hidden border border-[#C5DDF6] max-h-40">
                      <img src={photoForm.preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan & Hubungkan ke Memori AI
                </button>
              </form>
            </div>

            {/* List Foto Tersedia */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-4 flex items-center justify-between">
                <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                  Koleksi Foto & Materi AI ({referencePhotos.length})
                </span>
                <span className="text-xs text-[#4A6382]">
                  Dapat dikirimkan AI kepada siswa saat konseling
                </span>
              </div>

              {referencePhotos.length === 0 ? (
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-10 text-center text-slate-400 text-xs sm:text-sm">
                  Belum ada foto materi referensi konseling. Gunakan form di samping untuk mengunggah.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {referencePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-white border border-[#C5DDF6] rounded-2xl overflow-hidden shadow-2xs space-y-3 p-3.5"
                    >
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative">
                        <img
                          src={photo.file_url || photo.base64_data}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="absolute top-2 left-2 bg-[#163A5F]/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {photo.category}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-xs sm:text-sm text-[#163A5F] line-clamp-1">
                          {photo.title}
                        </h4>
                        <p className="text-[11px] text-[#4A6382] line-clamp-2 leading-relaxed">
                          {photo.description || 'Tidak ada deskripsi.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">ID #{photo.id}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id, photo.title)}
                          className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
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
      </main>

      {/* ===================================================================== */}
      {/* MODAL: INSPECT STUDENT TRANSCRIPT CHAT                                */}
      {/* ===================================================================== */}
      {inspectStudent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setInspectStudent(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F2F7FC] border-b border-[#C5DDF6] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StudentAvatar avatarIndex={inspectStudent.avatar_index || 0} size={40} />
                <div>
                  <div className="font-extrabold text-base text-[#163A5F] flex items-center gap-2">
                    <span>{inspectStudent.name}</span>
                    {Number(inspectStudent.is_emergency) === 1 && (
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold">
                        DARURAT
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4A6382]">
                    Kelas: {inspectStudent.class_name || 'Umum'} • Transkrip Konseling Lengkap Siswa
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Sessions Sidebar */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#C5DDF6] bg-[#FAFCFF] p-3 overflow-y-auto space-y-1.5 shrink-0 max-h-48 md:max-h-none">
                <div className="text-xs font-bold text-[#184B78] px-2 py-1">
                  Riwayat Sesi Obrolan ({studentSessions.length})
                </div>

                {studentSessions.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 italic">
                    Siswa belum memiliki sesi chat tersimpan.
                  </div>
                ) : (
                  studentSessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        selectedSessionId === s.id
                          ? 'bg-[#1E5FA8] text-white shadow-xs'
                          : 'hover:bg-[#E8F2FC] text-[#163A5F]'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="truncate">{s.topic_title || 'Konseling Umum'}</div>
                        <div className="text-[10px] opacity-75 font-normal">
                          {s.created_at || 'Sesi'}
                        </div>
                      </div>
                      <ChevronRight size={14} className="shrink-0 opacity-60" />
                    </button>
                  ))
                )}
              </div>

              {/* Chat Bubble Viewer */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50 space-y-3">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    <RefreshCw size={20} className="animate-spin text-[#1E5FA8] mr-2" />
                    <span>Memuat pesan percakapan...</span>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Pilih sesi di sebelah kiri untuk melihat isi percakapan lengkap.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={idx}
                        className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-full bg-[#1E5FA8] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            AI
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isUser
                              ? 'bg-[#1E5FA8] text-white rounded-br-none'
                              : 'bg-white text-[#163A5F] border border-[#C5DDF6] rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text || msg.message}</p>
                          <div
                            className={`text-[10px] mt-1 text-right ${
                              isUser ? 'text-white/70' : 'text-slate-400'
                            }`}
                          >
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INISIALISASI STATUS GAWAT DARURAT SISWA                       */}
      {/* ===================================================================== */}
      {showInitEmergencyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowInitEmergencyModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-base sm:text-lg">
                <ShieldAlert size={22} />
                <span>Inisialisasi Status Kedaruratan Siswa</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInitEmergencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleActivateEmergencySubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Pilih Siswa yang Membutuhkan Intervensi:
                </label>
                <select
                  required
                  value={emergencyTargetUserId}
                  onChange={(e) => setEmergencyTargetUserId(e.target.value)}
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                >
                  <option value="">-- Pilih Nama Siswa --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} (ID: #{st.id}) {Number(st.is_emergency) === 1 ? '— [Sudah Darurat]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Alasan Kedaruratan (Untuk Catatan Guru BK):
                </label>
                <textarea
                  rows={2}
                  required
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Contoh: Siswa dilaporkan mengalami intimidasi/bullying berat di kelas atau keputusasaan..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Pesan Peringatan & Instruksi di Layar Siswa (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={emergencyWarning}
                  onChange={(e) => setEmergencyWarning(e.target.value)}
                  placeholder="Contoh: PERINGATAN DARURAT: Guru BK menandai kondisimu memerlukan pendampingan segera. Silakan temui Guru BK sekarang."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInitEmergencyModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submittingEmergency}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShieldAlert size={16} />
                  <span>{submittingEmergency ? 'Menyimpan...' : 'Aktifkan Status Darurat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TANGGAPI PERMINTAAN TATAP MUKA (MANUAL APPROVAL)               */}
      {/* ===================================================================== */}
      {requestModal.show && requestModal.request && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRequestModal({ show: false, request: null, status: '', scheduledTime: '', counselorReply: '' })}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-base sm:text-lg">
                <GraduationCap size={22} className="text-[#1E5FA8]" />
                <span>Tinjauan Permohonan Bimbingan Tatap Muka</span>
              </div>
              <button
                type="button"
                onClick={() => setRequestModal({ show: false, request: null, status: '', scheduledTime: '', counselorReply: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#F4F9FF] border border-[#C5DDF6] rounded-2xl p-3.5 text-xs text-[#163A5F] space-y-1">
              <div>
                <strong>Siswa:</strong> {requestModal.request.user_name || requestModal.request.student_name || `Siswa #${requestModal.request.user_id}`}
              </div>
              <div>
                <strong>Topik:</strong> {requestModal.request.topic_title}
              </div>
              <div>
                <strong>Jadwal Permintaan Siswa:</strong> {requestModal.request.preferred_schedule}
              </div>
              <div>
                <strong>Pesan Siswa:</strong> "{requestModal.request.message}"
              </div>
            </div>

            <form onSubmit={handleSaveRequestSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Keputusan Guru BK:
                </label>
                <select
                  value={requestModal.status}
                  onChange={(e) => setRequestModal({ ...requestModal, status: e.target.value })}
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                >
                  <option value="Disetujui / Dijadwalkan">✅ Disetujui & Tentukan Jadwal Tatap Muka</option>
                  <option value="Jadwal Diatur Ulang / Ditolak">⚠️ Minta Jadwal Diatur Ulang / Ditolak</option>
                  <option value="Selesai Konseling">🎓 Tandai Selesai (Konseling Sudah Terlaksana)</option>
                  <option value="Menunggu Persetujuan Guru BK">⏳ Biarkan Menunggu Persetujuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Balasan Resmi & Jadwal Guru BK untuk Siswa:
                </label>
                <textarea
                  rows={4}
                  required
                  value={requestModal.counselorReply}
                  onChange={(e) => setRequestModal({ ...requestModal, counselorReply: e.target.value })}
                  placeholder="Tuliskan jadwal resmi (misal: Senin, jam 10.15 WIB di Ruang BK) serta pesan penyemangat untuk siswa..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestModal({ show: false, request: null, status: '', scheduledTime: '', counselorReply: '' })}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRequest}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {savingRequest ? 'Menyimpan...' : 'Simpan & Beritahu Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH / EDIT ARTIKEL KONSELING                                */}
      {/* ===================================================================== */}
      {articleModal.show && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setArticleModal({ ...articleModal, show: false })}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-base sm:text-lg">
                <FileText size={22} className="text-[#1E5FA8]" />
                <span>
                  {articleModal.mode === 'edit' ? 'Edit Artikel Konseling' : 'Tulis Artikel Konseling Baru'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setArticleModal({ ...articleModal, show: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveArticleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Kategori Artikel:
                  </label>
                  <select
                    value={articleModal.category}
                    onChange={(e) => setArticleModal({ ...articleModal, category: e.target.value })}
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                  >
                    <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                    <option value="Mengatasi Cemas & Stres">Mengatasi Cemas & Stres</option>
                    <option value="Percintaan Remaja">Percintaan Remaja</option>
                    <option value="Keluarga & Rumah">Keluarga & Rumah</option>
                    <option value="Motivasi Belajar">Motivasi Belajar</option>
                    <option value="Pengembangan Diri">Pengembangan Diri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Estimasi Waktu Baca:
                  </label>
                  <input
                    type="text"
                    required
                    value={articleModal.readTime}
                    onChange={(e) => setArticleModal({ ...articleModal, readTime: e.target.value })}
                    placeholder="Contoh: 3 menit, 5 menit"
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Judul Artikel:
                </label>
                <input
                  type="text"
                  required
                  value={articleModal.title}
                  onChange={(e) => setArticleModal({ ...articleModal, title: e.target.value })}
                  placeholder="Contoh: Mengapa Pertemanan Sehat Itu Penting Bagi Remaja"
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Ringkasan Singkat (Excerpt):
                </label>
                <textarea
                  rows={2}
                  value={articleModal.excerpt}
                  onChange={(e) => setArticleModal({ ...articleModal, excerpt: e.target.value })}
                  placeholder="Ringkasan 1-2 kalimat pengantar yang tampil di kartu pratinjau..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Isi Lengkap Artikel (Pisahkan Tiap Paragraf dengan Baris Kosong / Enter 2x):
                </label>
                <textarea
                  rows={8}
                  required
                  value={articleModal.content}
                  onChange={(e) => setArticleModal({ ...articleModal, content: e.target.value })}
                  placeholder="Tuliskan isi artikel konseling secara lengkap di sini. Tiap paragraf pisahkan dengan tombol Enter dua kali..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8] leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArticleModal({ ...articleModal, show: false })}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingArticle}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {savingArticle ? 'Menyimpan...' : articleModal.mode === 'edit' ? 'Simpan Perubahan' : 'Terbitkan Artikel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TAMBAH / EDIT VIDEO EDUKASI                                   */}
      {/* ===================================================================== */}
      {videoModal.show && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setVideoModal({ ...videoModal, show: false })}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-base sm:text-lg">
                <Video size={22} className="text-rose-600" />
                <span>
                  {videoModal.mode === 'edit' ? 'Edit Video Edukasi' : 'Tambah Video Edukasi Baru'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVideoModal({ ...videoModal, show: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVideoSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Kategori Video:
                  </label>
                  <select
                    value={videoModal.category}
                    onChange={(e) => setVideoModal({ ...videoModal, category: e.target.value })}
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                  >
                    <option value="Bimbingan Sosial">Bimbingan Sosial</option>
                    <option value="Manajemen Emosi">Manajemen Emosi</option>
                    <option value="Anti-Bullying">Anti-Bullying</option>
                    <option value="Motivasi Belajar">Motivasi Belajar</option>
                    <option value="Kesehatan Mental Remaja">Kesehatan Mental Remaja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                    Durasi Video:
                  </label>
                  <input
                    type="text"
                    required
                    value={videoModal.duration}
                    onChange={(e) => setVideoModal({ ...videoModal, duration: e.target.value })}
                    placeholder="Contoh: 5:20, 8:45"
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Judul Video Edukasi:
                </label>
                <input
                  type="text"
                  required
                  value={videoModal.title}
                  onChange={(e) => setVideoModal({ ...videoModal, title: e.target.value })}
                  placeholder="Contoh: Mengenali Sahabat Sejati vs Toxic Friends"
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Link / URL Video YouTube atau Video ID:
                </label>
                <input
                  type="text"
                  required
                  value={videoModal.youtubeUrlOrId}
                  onChange={(e) => setVideoModal({ ...videoModal, youtubeUrlOrId: e.target.value })}
                  placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau dQw4w9WgXcQ"
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              {/* YouTube Live Preview in Modal */}
              {extractYoutubeId(videoModal.youtubeUrlOrId) && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#184B78]">Pratinjau Video YouTube:</span>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[#C5DDF6]">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${extractYoutubeId(videoModal.youtubeUrlOrId)}`}
                      title="Preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Deskripsi Video:
                </label>
                <textarea
                  rows={2}
                  value={videoModal.description}
                  onChange={(e) => setVideoModal({ ...videoModal, description: e.target.value })}
                  placeholder="Penjelasan singkat mengenai isi video ini..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Poin-Poin Inti Pembelajaran (Key Takeaways - 1 Baris Per Poin):
                </label>
                <textarea
                  rows={3}
                  value={videoModal.keyTakeaways}
                  onChange={(e) => setVideoModal({ ...videoModal, keyTakeaways: e.target.value })}
                  placeholder="Contoh:&#10;Teman sejati menghargai batasan privasimu&#10;Jangan takut menolak ajakan yang merugikan diri sendiri"
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVideoModal({ ...videoModal, show: false })}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingVideo}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {savingVideo ? 'Menyimpan...' : videoModal.mode === 'edit' ? 'Simpan Perubahan' : 'Terbitkan Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
