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
} from 'lucide-react';

export default function TeacherPortal() {
  const navigate = useNavigate();
  const [teacherToken, setTeacherToken] = useState(
    () => localStorage.getItem('sociacare_teacher_token') || ''
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Active Tab: 'emergency' | 'students' | 'requests' | 'resources'
  const [activeTab, setActiveTab] = useState('emergency');
  const [bannerMsg, setBannerMsg] = useState(null);

  // Data states
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [counselorRequests, setCounselorRequests] = useState([]);
  const [referencePhotos, setReferencePhotos] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'emergency' | 'active'

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
  const [editingRequest, setEditingRequest] = useState(null);
  const [requestStatusInput, setRequestStatusInput] = useState('scheduled');
  const [counselorReplyInput, setCounselorReplyInput] = useState('');
  const [savingRequest, setSavingRequest] = useState(false);

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
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setLoginError(data.error || 'Password Guru BK salah.');
        return;
      }
      localStorage.setItem('sociacare_teacher_token', data.token);
      setTeacherToken(data.token);
      setPasswordInput('');
    } catch {
      setLoginError('Gagal menghubungi server. Pastikan server aktif.');
    } finally {
      setLoadingLogin(false);
    }
  }

  function handleTeacherLogout() {
    localStorage.removeItem('sociacare_teacher_token');
    setTeacherToken('');
    setStudents([]);
    setSessions([]);
    setCounselorRequests([]);
  }

  async function loadAllData() {
    setLoadingData(true);
    try {
      const [usersRes, sessRes, bkRes, photosRes] = await Promise.all([
        fetch('/api/admin/users', { headers: authHeaders() }),
        fetch('/api/admin/sessions', { headers: authHeaders() }),
        fetch('/api/admin/counselor-requests', { headers: authHeaders() }),
        fetch('/api/admin/photos', { headers: authHeaders() }),
      ]);

      if (usersRes.status === 401) {
        handleTeacherLogout();
        return;
      }

      const usersData = await usersRes.json();
      const sessData = await sessRes.json();
      const bkData = await bkRes.json();
      const photosData = await photosRes.json();

      if (usersData.users) setStudents(usersData.users);
      if (sessData.sessions) setSessions(sessData.sessions);
      if (bkData.requests) setCounselorRequests(bkData.requests);
      if (photosData.photos) setReferencePhotos(photosData.photos);
    } catch (err) {
      console.error('Error loading teacher data:', err);
      showNotification('error', 'Gagal memuat data.');
    } finally {
      setLoadingData(false);
    }
  }

  // Open chat transcript for a student
  async function handleOpenStudentChat(student) {
    setInspectStudent(student);
    setSelectedSessionId(null);
    setChatMessages([]);
    setLoadingChat(true);

    try {
      const res = await fetch(`/api/admin/users/${student.id}/detail`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      const userSessions = data.sessions || [];
      setStudentSessions(userSessions);

      if (userSessions.length > 0) {
        // Load the latest session
        await handleSelectSession(userSessions[0].id);
      }
    } catch (err) {
      showNotification('error', 'Gagal memuat percakapan siswa.');
    } finally {
      setLoadingChat(false);
    }
  }

  async function handleSelectSession(sessId) {
    setSelectedSessionId(sessId);
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/sessions/${sessId}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (err) {
      showNotification('error', 'Gagal memuat pesan sesi chat.');
    } finally {
      setLoadingChat(false);
    }
  }

  // Initialize Emergency for Student
  async function handleInitEmergencySubmit(e) {
    e.preventDefault();
    if (!emergencyTargetUserId) {
      showNotification('error', 'Pilih siswa yang akan ditandai gawat darurat.');
      return;
    }
    setSubmittingEmergency(true);
    try {
      const target = students.find((s) => String(s.id) === String(emergencyTargetUserId));
      const res = await fetch(`/api/admin/users/${emergencyTargetUserId}/emergency`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          isEmergency: true,
          reason: emergencyReason || 'Diinisialisasi oleh Guru BK / Konselor Sekolah.',
          warningAi:
            emergencyWarning ||
            `PERINGATAN DARURAT: Guru BK menandai kondisimu memerlukan pendampingan segera. Silakan temui Guru BK di ruang konseling atau hubungi guru pendampingmu.`,
        }),
      });
      if (res.ok) {
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

  // Handle Counselor Request Update
  async function handleSaveRequestStatus(e) {
    e.preventDefault();
    if (!editingRequest) return;
    setSavingRequest(true);
    try {
      const res = await fetch(`/api/admin/counselor-requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          status: requestStatusInput,
          counselorReply: counselorReplyInput,
        }),
      });
      if (res.ok) {
        showNotification('success', 'Tanggapan Guru BK berhasil disimpan!');
        setEditingRequest(null);
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

  // Photo file picker
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

  // Filter students list
  const emergencyStudents = students.filter((s) => Number(s.is_emergency) === 1);
  const emergencyCount = emergencyStudents.length;

  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase().trim();
    const matchName = !q || s.name.toLowerCase().includes(q) || String(s.id).includes(q);
    if (!matchName) return false;
    if (filterMode === 'emergency') return Number(s.is_emergency) === 1;
    if (filterMode === 'active') return Number(s.session_count) > 0;
    return true;
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
            Halaman khusus untuk Guru Bimbingan Konseling (BK) memantau kondisi siswa, membaca riwayat konseling, dan menangani siswa dalam situasi darurat.
          </p>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3.5 rounded-xl">
              {loginError}
            </div>
          )}

          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#184B78] mb-1.5">
                Password Guru BK
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password Guru BK (default: gurubk123)"
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

          <div className="pt-2 border-t border-slate-100 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E5FA8] hover:underline"
            >
              <ArrowLeft size={14} />
              Kembali ke Halaman Siswa
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
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            bannerMsg.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {bannerMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="bg-[#102A45] text-white sticky top-0 z-40 border-b border-white/10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SociaHeartLogo size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight">
                  SociaCare AI
                </span>
                <span className="bg-[#1E5FA8] text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Ruang Guru BK
                </span>
              </div>
              <p className="text-[11px] text-sky-200 hidden sm:block">
                Pusat Pemantauan, Konseling & Penanganan Darurat Siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={loadAllData}
              disabled={loadingData}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={loadingData ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <Link
              to="/"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 text-xs font-bold transition flex items-center gap-1.5"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Halaman Siswa</span>
            </Link>

            <button
              type="button"
              onClick={handleTeacherLogout}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Keluar"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* EMERGENCY ALERT BANNER IF ACTIVE */}
      {emergencyCount > 0 && (
        <div className="bg-red-600 text-white px-4 py-3 shadow-md animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold">
              <AlertTriangle size={18} className="shrink-0 text-amber-300" />
              <span>
                PERINGATAN KRITIS: Ada {emergencyCount} siswa yang sedang dalam kondisi GAWAT DARURAT dan membutuhkan bantuan Guru BK segera!
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('emergency');
                setFilterMode('emergency');
              }}
              className="bg-white text-red-700 text-xs font-extrabold px-3 py-1.5 rounded-lg shrink-0 hover:bg-amber-100 transition cursor-pointer"
            >
              Tangani Sekarang →
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => {
              setActiveTab('emergency');
              setFilterMode('emergency');
            }}
            className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
              emergencyCount > 0
                ? 'bg-red-50 border-red-300 hover:bg-red-100'
                : 'bg-white border-[#C5DDF6] hover:border-[#1E5FA8]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Status Darurat</span>
              <span
                className={`p-2 rounded-xl ${
                  emergencyCount > 0 ? 'bg-red-600 text-white' : 'bg-[#E8F2FC] text-[#1E5FA8]'
                }`}
              >
                <ShieldAlert size={18} />
              </span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold mt-2 ${
                emergencyCount > 0 ? 'text-red-600' : 'text-[#163A5F]'
              }`}
            >
              {emergencyCount}
            </div>
            <div className="text-[11px] text-[#4A6382] mt-1 font-semibold">
              {emergencyCount > 0 ? 'Perlu tindakan segera!' : 'Kondisi siswa aman'}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('students')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 sm:p-5 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Total Siswa</span>
              <span className="p-2 rounded-xl bg-[#E8F2FC] text-[#1E5FA8]">
                <Users size={18} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-2">
              {students.length}
            </div>
            <div className="text-[11px] text-[#4A6382] mt-1 font-semibold">
              Siswa/siswi terdaftar
            </div>
          </div>

          <div
            onClick={() => setActiveTab('students')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 sm:p-5 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Sesi Konseling</span>
              <span className="p-2 rounded-xl bg-[#E8F2FC] text-[#1E5FA8]">
                <MessageSquare size={18} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-2">
              {sessions.length}
            </div>
            <div className="text-[11px] text-[#4A6382] mt-1 font-semibold">
              Obrolan siswa dengan AI
            </div>
          </div>

          <div
            onClick={() => setActiveTab('requests')}
            className="bg-white border border-[#C5DDF6] hover:border-[#1E5FA8] p-4 sm:p-5 rounded-2xl transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4A6382]">Bimbingan Tatap Muka</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <GraduationCap size={18} />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#163A5F] mt-2">
              {counselorRequests.length}
            </div>
            <div className="text-[11px] text-[#4A6382] mt-1 font-semibold">
              {counselorRequests.filter((r) => r.status === 'pending').length} menunggu respon
            </div>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-2 p-1.5 bg-[#E2EDF9] rounded-2xl max-w-fit border border-[#C5DDF6] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'emergency'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <ShieldAlert size={16} />
            <span>Pusat Gawat Darurat</span>
            {emergencyCount > 0 && (
              <span className="bg-white text-red-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {emergencyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <GraduationCap size={16} />
            <span>Permintaan Tatap Muka</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
              {counselorRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-[#1E5FA8] text-white shadow-xs'
                : 'text-[#163A5F] hover:bg-white/60'
            }`}
          >
            <ImageIcon size={16} />
            <span>Materi & Foto Edukasi AI</span>
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
                <p className="text-xs sm:text-sm text-[#4A6382] mt-1.5 leading-relaxed max-w-2xl">
                  Guru BK dapat memantau siswa yang terdeteksi dalam krisis keselamatan (keinginan melukai diri, depresi berat, atau perundungan berbahaya), serta menginisialisasi status darurat secara manual untuk siswa yang membutuhkan perlindungan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowInitEmergencyModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-full transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={16} />
                <span>+ Inisialisasi Status Darurat Siswa</span>
              </button>
            </div>

            {/* List Siswa Darurat Aktif */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-extrabold text-[#163A5F] flex items-center gap-2">
                <span>Siswa Dalam Status Darurat Aktif ({emergencyStudents.length})</span>
                {emergencyStudents.length > 0 && (
                  <span className="bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    Butuh Tindakan
                  </span>
                )}
              </h3>

              {emergencyStudents.length === 0 ? (
                <div className="bg-white border border-[#C5DDF6] rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                  <div className="font-extrabold text-[#163A5F] text-sm sm:text-base">
                    Alhamdulillah, Saat Ini Tidak Ada Siswa dalam Kondisi Darurat
                  </div>
                  <p className="text-xs text-[#4A6382] max-w-md mx-auto">
                    Seluruh siswa berada dalam status normal. Sistem AI akan terus memantau setiap percakapan dan segera memberi sinyal peringatan jika ada indikasi krisis.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emergencyStudents.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border-2 border-red-400 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
                      <div className="flex items-start justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                          <StudentAvatar style={st.avatar_style} size={42} />
                          <div>
                            <h4 className="font-extrabold text-base text-[#163A5F]">
                              {st.name}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              ID Siswa: #{st.id} • Terakhir aktif: {st.last_active_at || 'Baru saja'}
                            </span>
                          </div>
                        </div>

                        <span className="bg-red-100 text-red-700 font-extrabold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                          <AlertTriangle size={12} />
                          KONDISI KRITIS
                        </span>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-950 space-y-1">
                        <div className="font-bold text-red-700 uppercase text-[10px] tracking-wider">
                          Alasan Indikasi Darurat:
                        </div>
                        <p className="leading-relaxed">
                          {st.emergency_reason || 'Terdeteksi kondisi krisis keselamatan oleh AI.'}
                        </p>
                      </div>

                      {st.emergency_warning_ai && (
                        <div className="bg-[#FFF8E6] border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-1">
                          <div className="font-bold text-amber-800 uppercase text-[10px] tracking-wider">
                            Pesan Peringatan di Layar Siswa:
                          </div>
                          <p className="leading-relaxed italic">
                            "{st.emergency_warning_ai}"
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenStudentChat(st)}
                          className="bg-[#E8F2FC] hover:bg-[#D5E8FA] text-[#1E5FA8] font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare size={14} />
                          <span>Baca Transkrip Chat Siswa</span>
                        </button>

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
        {/* TAB 2: AKTIVITAS & TRANSKRIP CHAT SISWA                            */}
        {/* =================================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-5">
            {/* Header and Search Filters */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari nama siswa atau ID..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-[#1E5FA8]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#F0F6FC] p-1 rounded-xl border border-[#C5DDF6] shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#1E5FA8] text-white'
                      : 'text-[#4A6382] hover:bg-white'
                  }`}
                >
                  Semua ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('emergency')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'emergency'
                      ? 'bg-red-600 text-white'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                >
                  🚨 Darurat ({emergencyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterMode === 'active'
                      ? 'bg-[#1E5FA8] text-white'
                      : 'text-[#4A6382] hover:bg-white'
                  }`}
                >
                  Pernah Konseling ({students.filter((s) => Number(s.session_count) > 0).length})
                </button>
              </div>
            </div>

            {/* Students List Table */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#E8F2FC] text-[#163A5F] border-b border-[#C5DDF6] font-extrabold">
                      <th className="py-3 px-4">Siswa / Siswi</th>
                      <th className="py-3 px-4">Status Kondisi</th>
                      <th className="py-3 px-4">Sesi Konseling</th>
                      <th className="py-3 px-4">Total Chat</th>
                      <th className="py-3 px-4">Terakhir Aktif</th>
                      <th className="py-3 px-4 text-center">Aksi Guru BK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F7FF]">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Tidak ditemukan siswa dengan kriteria pencarian ini.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr
                          key={st.id}
                          className={`hover:bg-[#F8FBFF] transition ${
                            Number(st.is_emergency) === 1 ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <StudentAvatar style={st.avatar_style} size={36} />
                              <div>
                                <div className="font-extrabold text-[#163A5F]">
                                  {st.name}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  ID: #{st.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {Number(st.is_emergency) === 1 ? (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-extrabold text-[11px] px-2.5 py-1 rounded-full">
                                <AlertTriangle size={12} />
                                GAWAT DARURAT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold text-[11px] px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={12} />
                                Normal
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-[#1E5FA8]">
                            {st.session_count || 0} Sesi
                          </td>

                          <td className="py-3.5 px-4 text-[#4A6382] font-semibold">
                            {st.message_count || 0} Pesan
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-[#4A6382]">
                            {st.last_active_at || 'Baru saja'}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenStudentChat(st)}
                                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Buka seluruh percakapan chat siswa dengan AI"
                              >
                                <MessageSquare size={13} />
                                <span>Lihat Chat</span>
                              </button>

                              {Number(st.is_emergency) === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleResolveEmergency(st)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  title="Selesaikan status darurat"
                                >
                                  Tandai Selesai
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEmergencyTargetUserId(String(st.id));
                                    setShowInitEmergencyModal(true);
                                  }}
                                  className="text-red-600 hover:bg-red-50 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition cursor-pointer"
                                  title="Inisialisasi status darurat untuk siswa ini"
                                >
                                  Set Darurat
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PERMINTAAN KONSEING TATAP MUKA (GURU BK)                    */}
        {/* =================================================================== */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#163A5F]">
                  Pengajuan Bimbingan Langsung Siswa ({counselorRequests.length})
                </h3>
                <p className="text-xs text-[#4A6382] mt-0.5">
                  Daftar siswa yang mengajukan jadwal tatap muka langsung di ruang BK melalui aplikasi.
                </p>
              </div>
            </div>

            {counselorRequests.length === 0 ? (
              <div className="bg-white border border-[#C5DDF6] rounded-2xl p-8 text-center text-slate-400 text-xs sm:text-sm">
                Belum ada pengajuan bimbingan langsung dari siswa.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {counselorRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                        {req.student_name || `Siswa #${req.user_id}`}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          req.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'scheduled'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status === 'completed'
                          ? 'Selesai'
                          : req.status === 'scheduled'
                          ? 'Dijadwalkan'
                          : 'Menunggu Respon'}
                      </span>
                    </div>

                    <div className="text-xs text-[#4A6382] space-y-1">
                      <div>
                        <strong>Topik Masalah:</strong> {req.topic_title || 'Konseling Umum'}
                      </div>
                      <div>
                        <strong>Catatan Siswa:</strong>{' '}
                        <span className="italic">
                          "{req.notes || req.message || 'Tidak ada catatan tambahan.'}"
                        </span>
                      </div>
                      {req.preferred_time && (
                        <div>
                          <strong>Waktu Diminta Siswa:</strong> {req.preferred_time}
                        </div>
                      )}
                      <div>
                        <strong>Diajukan Pada:</strong> {req.created_at || 'Baru saja'}
                      </div>
                    </div>

                    {req.counselor_reply && (
                      <div className="bg-[#EBF4FD] p-3 rounded-xl text-xs text-[#163A5F]">
                        <strong>Balasan Guru BK:</strong> {req.counselor_reply}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRequest(req);
                          setRequestStatusInput(req.status || 'scheduled');
                          setCounselorReplyInput(req.counselor_reply || '');
                        }}
                        className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Tanggapi / Jadwalkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: MATERI & FOTO EDUKASI AI                                    */}
        {/* =================================================================== */}
        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Upload Materi Baru */}
            <div className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-[#163A5F] font-extrabold text-sm sm:text-base border-b border-[#F0F7FF] pb-3">
                <ImageIcon size={18} className="text-[#1E5FA8]" />
                <span>Upload Foto Referensi Baru untuk AI</span>
              </div>

              <form onSubmit={handleAddPhotoSubmit} className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#184B78] mb-1">
                    Pilih File Gambar dari Perangkat:
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileSelect}
                    className="w-full text-xs text-[#163A5F] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#E8F2FC] file:text-[#1E5FA8] cursor-pointer border border-[#C5DDF6] rounded-xl p-2 bg-[#F4F9FF]"
                  />
                </div>

                {photoForm.preview && (
                  <div className="relative rounded-xl overflow-hidden border border-[#C5DDF6] bg-slate-900 max-h-40 flex items-center justify-center">
                    <img src={photoForm.preview} alt="Preview" className="max-h-36 object-contain" />
                    <button
                      type="button"
                      onClick={() => setPhotoForm((p) => ({ ...p, preview: '', base64Data: '' }))}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-md text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#184B78] mb-1">
                    Judul Infografis *
                  </label>
                  <input
                    type="text"
                    required
                    value={photoForm.title}
                    onChange={(e) => setPhotoForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Contoh: Langkah Menghadapi Bullying"
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3 py-2 text-xs font-semibold text-[#163A5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#184B78] mb-1">
                    Kategori Konseling
                  </label>
                  <select
                    value={photoForm.category}
                    onChange={(e) => setPhotoForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3 py-2 text-xs font-semibold text-[#163A5F]"
                  >
                    <option value="Hubungan Pertemanan">Hubungan Pertemanan</option>
                    <option value="Komunikasi Efektif">Komunikasi Efektif</option>
                    <option value="Kepercayaan Diri">Kepercayaan Diri</option>
                    <option value="Mencegah Bullying">Mencegah Bullying</option>
                    <option value="Bimbingan Konseling Umum">Bimbingan Konseling Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#184B78] mb-1">
                    Pelajaran Edukasi untuk AI
                  </label>
                  <textarea
                    rows={3}
                    value={photoForm.description}
                    onChange={(e) => setPhotoForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Jelaskan kapan AI harus mengirim foto ini dan apa pesan kuncinya..."
                    className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3 py-2 text-xs font-semibold text-[#163A5F]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={15} />
                  <span>Simpan Materi untuk AI</span>
                </button>
              </form>
            </div>

            {/* List Materi Tersedia */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                Katalog Foto & Infografis Konseling ({referencePhotos.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {referencePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white border border-[#C5DDF6] rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative pb-[56%] bg-slate-900">
                        <img
                          src={photo.file_url}
                          alt={photo.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <span className="bg-[#E6F1FC] text-[#1E5FA8] text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {photo.category}
                        </span>
                        <h5 className="font-extrabold text-sm text-[#163A5F]">{photo.title}</h5>
                        <p className="text-xs text-[#4A6382] line-clamp-2">{photo.description}</p>
                      </div>
                    </div>

                    <div className="p-3.5 pt-0 text-[11px] font-mono text-slate-400">
                      {photo.file_url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODAL: BACA TRANSKRIP CHAT SISWA                                     */}
      {/* ===================================================================== */}
      {inspectStudent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setInspectStudent(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#102A45] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StudentAvatar style={inspectStudent.avatar_style} size={40} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg">
                      {inspectStudent.name}
                    </h3>
                    {Number(inspectStudent.is_emergency) === 1 && (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🚨 Kritis
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-sky-200">
                    Transkrip Riwayat Konseling Siswa dengan SociaCare AI
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Sesi Selector + Chat Viewer */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Sesi List */}
              <div className="w-full md:w-64 border-r border-[#E2EEF9] bg-[#F8FBFF] p-3 overflow-y-auto shrink-0 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4A6382] px-1">
                  Pilih Sesi Konseling:
                </div>
                {studentSessions.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2">Siswa belum memiliki sesi konseling.</div>
                ) : (
                  studentSessions.map((sess) => (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => handleSelectSession(sess.id)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                        selectedSessionId === sess.id
                          ? 'bg-[#1E5FA8] text-white border-[#1E5FA8] shadow-xs'
                          : 'bg-white text-[#163A5F] border-[#D5E6F7] hover:bg-[#EDF5FD]'
                      }`}
                    >
                      <div className="font-extrabold truncate">
                        {sess.topic_title || 'Konseling'}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          selectedSessionId === sess.id ? 'text-sky-200' : 'text-[#6A8AA8]'
                        }`}
                      >
                        {sess.created_at || 'Baru saja'}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Right Column: Chat Transcript Bubble */}
              <div className="flex-1 p-4 overflow-y-auto bg-[#F4F9FD] space-y-3.5 max-h-[60vh] md:max-h-none">
                {loadingChat ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#1E5FA8]" />
                    Memuat isi percakapan...
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Tidak ada pesan dalam sesi ini.
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    const struct = msg.structured || {};
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex items-start gap-2.5 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUser && <SociaHeartLogo size={28} className="shrink-0 mt-1" />}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs space-y-2 ${
                            isUser
                              ? 'bg-[#1E5FA8] text-white rounded-tr-xs font-medium'
                              : struct.isEmergency
                              ? 'bg-red-50 border-2 border-red-500 text-red-950 rounded-tl-xs'
                              : 'bg-white border border-[#D5E6F7] text-[#1E3A5F] rounded-tl-xs'
                          }`}
                        >
                          <div className="font-bold text-[10px] uppercase opacity-75">
                            {isUser ? inspectStudent.name : 'SociaCare AI'}
                          </div>
                          <div className="whitespace-pre-line">{msg.content}</div>

                          {/* Emergency indicator inside bubble */}
                          {struct.isEmergency && struct.emergencyWarning && (
                            <div className="bg-red-600 text-white rounded-lg p-2 text-xs font-semibold">
                              🚨 {struct.emergencyWarning}
                            </div>
                          )}

                          {/* Checklist Solutions */}
                          {Array.isArray(struct.checklist) && struct.checklist.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1">
                              {struct.checklist.map((item, cIdx) => (
                                <div key={cIdx} className="flex items-start gap-1.5 text-xs">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Tip Box */}
                          {struct.tipBox && struct.tipBox.text && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
                              💡 <strong>{struct.tipBox.title || 'Tips:'}</strong> {struct.tipBox.text}
                            </div>
                          )}

                          {/* Infographic card if any */}
                          {struct.infographic && struct.infographic.url && (
                            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 mt-2">
                              <img
                                src={struct.infographic.url}
                                alt={struct.infographic.title || 'Infografis'}
                                className="w-full max-h-48 object-cover"
                              />
                              <div className="p-2 text-[11px] text-white bg-black/60">
                                {struct.infographic.title}
                              </div>
                            </div>
                          )}
                        </div>
                        {isUser && (
                          <StudentAvatar style={inspectStudent.avatar_style} size={28} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-white border-t border-[#E8F2FC] flex items-center justify-between text-xs text-slate-500">
              <span>Siswa: {inspectStudent.name}</span>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="bg-[#E8F2FC] hover:bg-[#D5E8FA] text-[#1E5FA8] font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Tutup Transkrip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INISIALISASI STATUS GAWAT DARURAT                             */}
      {/* ===================================================================== */}
      {showInitEmergencyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowInitEmergencyModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <div className="flex items-center gap-2.5 text-red-700">
                <ShieldAlert size={22} />
                <h3 className="font-extrabold text-base sm:text-lg">
                  Inisialisasi Status Gawat Darurat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInitEmergencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#4A6382] leading-relaxed">
              Tindakan ini akan mengaktifkan status <strong>KRITIS</strong> pada siswa terpilih. Layar konseling siswa akan menampilkan arahan darurat khusus dan Guru BK akan mendapatkan prioritas pemantauan.
            </p>

            <form onSubmit={handleInitEmergencySubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Pilih Siswa / Siswi yang Membutuhkan Bantuan:
                </label>
                <select
                  required
                  value={emergencyTargetUserId}
                  onChange={(e) => setEmergencyTargetUserId(e.target.value)}
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F] focus:outline-none focus:border-red-500"
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
      {/* MODAL: TANGGAPI PERMINTAAN KONSEING TATAP MUKA                        */}
      {/* ===================================================================== */}
      {editingRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingRequest(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F0F7FF] pb-3">
              <h3 className="font-extrabold text-base text-[#163A5F]">
                Tanggapi Pengajuan Bimbingan Tatap Muka
              </h3>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRequestStatus} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Status Pengajuan:
                </label>
                <select
                  value={requestStatusInput}
                  onChange={(e) => setRequestStatusInput(e.target.value)}
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                >
                  <option value="pending">Menunggu Respon (Pending)</option>
                  <option value="scheduled">Sudah Dijadwalkan (Scheduled)</option>
                  <option value="completed">Bimbingan Selesai (Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3A5F] mb-1">
                  Catatan / Balasan Guru BK untuk Siswa:
                </label>
                <textarea
                  rows={3}
                  value={counselorReplyInput}
                  onChange={(e) => setCounselorReplyInput(e.target.value)}
                  placeholder="Contoh: Silakan temui Ibu di Ruang BK besok istirahat pertama pukul 10.00 ya..."
                  className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#163A5F]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRequest}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs"
                >
                  {savingRequest ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
