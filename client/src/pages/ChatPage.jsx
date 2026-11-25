import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SociaHeartLogo, StudentAvatar } from '../components/Illustrations';
import {
  MoreVertical,
  Send,
  Check,
  Sparkles,
  Trash2,
  CheckCircle2,
  LogOut,
  PlusCircle,
  Grid,
  CheckCircle,
  AlertTriangle,
  PhoneCall,
  Clock,
  ArrowLeft,
  ZoomIn,
  Image as ImageIcon,
  Download,
  X,
} from 'lucide-react';

function formatChatMessageText(text) {
  if (!text) return null;
  const lines = String(text).split('\n');
  return lines.map((line, lIdx) => {
    // Process markdown bold (**...**) and italic (*...*)
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={pIdx} className="font-extrabold text-[#112F4E]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={pIdx} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });

    if (line.trim() === '') {
      return <div key={lIdx} className="h-1.5" />;
    }

    return (
      <span key={lIdx} className="block leading-relaxed">
        {formattedLine}
      </span>
    );
  });
}

function sanitizeSafeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/infographics/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  return '#';
}

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentUser,
    setCurrentUser,
    handleLogoutProfile,
    userSessions,
    fetchUserSessions,
    deleteSession,
    setEmergencyModalWarning,
    setBkForm,
  } = useApp();

  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [reopenedClosedChat, setReopenedClosedChat] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const messagesContainerRef = useRef(null);
  const loadedSessionIdRef = useRef(null);
  const creatingDefaultRef = useRef(false);
  const isInitialLoad = useRef(true);
  const autoSentTextRef = useRef(null);

  // Auto-scroll on new message or typing change
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    if (isInitialLoad.current) {
      if (messages.length > 0) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
        isInitialLoad.current = false;
      }
      return;
    }

    // Smooth scroll container to bottom for new messages
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, sendingMessage]);

  // Dynamic browser tab title
  useEffect(() => {
    if (currentSession?.topic_title) {
      document.title = `${currentSession.topic_title} — Ruang Konseling | SociaCare AI`;
    } else {
      document.title = 'Ruang Konseling AI | SociaCare AI';
    }
  }, [currentSession?.topic_title]);

  // Load or redirect to active session
  useEffect(() => {
    const saved = localStorage.getItem('sociacare_user');
    if (!currentUser && !saved) {
      navigate('/', { replace: true });
      return;
    }

    if (sessionId) {
      if (loadedSessionIdRef.current !== String(sessionId)) {
        loadedSessionIdRef.current = String(sessionId);
        loadSession(sessionId);
      }
    } else {
      if (userSessions.length > 0) {
        navigate(`/chat/${userSessions[0].id}`, { replace: true });
      } else if (!creatingDefaultRef.current) {
        creatingDefaultRef.current = true;
        createDefaultSession();
      }
    }
  }, [sessionId, userSessions.length]);

  async function createDefaultSession() {
    try {
      let activeUser =
        currentUser ||
        JSON.parse(localStorage.getItem('sociacare_user') || 'null');

      // Auto-recover jika user belum tersimpan
      if (!activeUser?.id) {
        const devToken = localStorage.getItem('sociacare_device_token') || '';
        const resIdent = await fetch('/api/users/identify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-token': devToken,
          },
          body: JSON.stringify({
            name: 'Teman',
            avatarStyle: 'student-female',
            deviceToken: devToken,
          }),
        });
        const identData = await resIdent.json();
        if (identData.user) {
          activeUser = identData.user;
          setCurrentUser(activeUser);
          localStorage.setItem('sociacare_user', JSON.stringify(activeUser));
        }
      }

      if (!activeUser?.id) {
        navigate('/', { replace: true });
        return;
      }

      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/users/${activeUser.id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': devToken,
        },
        body: JSON.stringify({ topicId: 'friendship', deviceToken: devToken }),
      });
      const data = await res.json();
      if (data.session) {
        setCurrentSession(data.session);
        setMessages(data.messages || []);
        await fetchUserSessions(activeUser.id);
        loadedSessionIdRef.current = String(data.session.id);
        navigate(`/chat/${data.session.id}`, { replace: true });
      } else {
        navigate('/topics', { replace: true });
      }
    } catch (err) {
      console.error('Failed to create default session:', err);
      navigate('/topics', { replace: true });
    } finally {
      creatingDefaultRef.current = false;
      setLoadingSession(false);
    }
  }

  async function loadSession(idToLoad) {
    setLoadingSession(true);
    try {
      const activeUser =
        currentUser ||
        JSON.parse(localStorage.getItem('sociacare_user') || 'null');
      const userIdParam = activeUser?.id
        ? `?userId=${encodeURIComponent(activeUser.id)}`
        : '';
      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/sessions/${idToLoad}${userIdParam}`, {
        headers: { 'x-device-token': devToken },
      });
      const data = await res.json();
      if (data.session) {
        setCurrentSession(data.session);
        setMessages(data.messages || []);
        setReopenedClosedChat(false);
        // Only update currentUser if emergency status actually changed to prevent re-render loops
        if (
          data.user &&
          activeUser &&
          data.user.is_emergency !== activeUser.is_emergency
        ) {
          setCurrentUser(data.user);
          localStorage.setItem('sociacare_user', JSON.stringify(data.user));
        }
      } else {
        // Jika sesi tidak ditemukan, cari sesi lain milik user atau buatkan sesi baru otomatis
        if (userSessions.length > 0 && String(userSessions[0].id) !== String(idToLoad)) {
          navigate(`/chat/${userSessions[0].id}`, { replace: true });
        } else {
          await createDefaultSession();
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      if (userSessions.length > 0 && String(userSessions[0].id) !== String(idToLoad)) {
        navigate(`/chat/${userSessions[0].id}`, { replace: true });
      } else {
        await createDefaultSession();
      }
    } finally {
      setLoadingSession(false);
      // Instant scroll to bottom after DOM paint
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }

  async function handleDeleteSession(idToDelete, e) {
    e.stopPropagation();
    await deleteSession(idToDelete, e);
    if (String(idToDelete) === String(sessionId)) {
      navigate('/topics');
    }
  }

  async function handleSendMessage(customText = null) {
    const textToSend = (customText !== null ? customText : chatInput).trim();
    if (!textToSend || sendingMessage) return;

    if (textToSend === 'Selesai & Penutup 💙') {
      navigate('/closing');
      return;
    }
    if (textToSend === 'Pilih Topik Baru') {
      navigate('/topics');
      return;
    }
    if (textToSend === 'Fitur Lainnya') {
      navigate('/extras');
      return;
    }
    if (
      textToSend === 'Hubungi Guru BK' ||
      textToSend === '🚨 Hubungi Guru BK'
    ) {
      setBkForm((prev) => ({
        ...prev,
        urgency: isEmergencyMode ? 'darurat' : prev.urgency,
      }));
      navigate('/extras/counselor');
      return;
    }

    if (!currentSession) return;

    setChatInput('');
    setChatError(null);
    setReopenedClosedChat(false);
    setSendingMessage(true);

    const optimisticUserMsg = {
      id: Date.now(),
      sender: 'user',
      content: textToSend,
      structured: null,
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/sessions/${currentSession.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': devToken,
        },
        body: JSON.stringify({ content: textToSend, deviceToken: devToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP error ${res.status}`);
      }
      if (data.messages) {
        setCurrentSession(data.session);
        setMessages(data.messages);
        if (
          data.user &&
          currentUser &&
          data.user.is_emergency !== currentUser.is_emergency
        ) {
          setCurrentUser(data.user);
          localStorage.setItem('sociacare_user', JSON.stringify(data.user));
        }
        if (data.emergencyTriggered) {
          const latestAi = data.messages?.findLast((m) => m.sender === 'ai');
          setEmergencyModalWarning(
            latestAi?.structured?.emergencyWarning ||
              data.user?.emergency_warning_ai ||
              'PERINGATAN DARURAT AI: Sistem mendeteksi kamu sedang berada dalam kondisi yang sangat berat dan darurat. Keselamatanmu adalah yang paling utama. Mohon segera hubungi Konselor / Guru BK atau layanan darurat.'
          );
        }
        if (currentUser?.id) {
          fetchUserSessions(currentUser.id);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      let recovered = false;
      // Sinkronkan ulang data pesan dari database jika request sempat terputus di jaringan
      if (currentSession?.id) {
        try {
          const activeUser =
            currentUser ||
            JSON.parse(localStorage.getItem('sociacare_user') || 'null');
          const userIdParam = activeUser?.id
            ? `?userId=${encodeURIComponent(activeUser.id)}`
            : '';
          const devToken = localStorage.getItem('sociacare_device_token') || '';
          const syncRes = await fetch(
            `/api/sessions/${currentSession.id}${userIdParam}`,
            { headers: { 'x-device-token': devToken } }
          );
          const syncData = await syncRes.json();
          if (syncData.messages && syncData.messages.length > 0) {
            setMessages(syncData.messages);
            if (syncData.session) setCurrentSession(syncData.session);
            // Cek apakah pesan balasan AI terakhir sudah masuk di database
            const lastMsg = syncData.messages[syncData.messages.length - 1];
            if (lastMsg && lastMsg.sender === 'ai') {
              recovered = true;
            }
          }
        } catch (syncErr) {
          console.warn('Sync fallback error:', syncErr);
        }
      }

      // Jika gagal (tidak ada balasan AI yang masuk), tampilkan pesan error asli tanpa fallback palsu
      if (!recovered) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
        setChatInput(textToSend);
        setChatError({
          message:
            err?.message ||
            'Gagal terhubung ke layanan AI. Silakan periksa koneksi atau coba kirim ulang pesanmu.',
          failedText: textToSend,
        });
      }
    } finally {
      setSendingMessage(false);
    }
  }

  // Auto-send or pre-fill prompt from navigation state (e.g. from ExtrasPage article/video discuss)
  useEffect(() => {
    const autoSend = location.state?.autoSendText;
    if (
      autoSend &&
      !loadingSession &&
      currentSession &&
      !sendingMessage &&
      autoSentTextRef.current !== autoSend
    ) {
      autoSentTextRef.current = autoSend;
      navigate(location.pathname, { replace: true, state: {} });
      handleSendMessage(autoSend);
    }
  }, [location.state?.autoSendText, loadingSession, currentSession?.id, sendingMessage]);

  useEffect(() => {
    const draft = location.state?.initialDraft;
    if (draft && !chatInput) {
      setChatInput(draft);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.initialDraft]);

  const isEmergencyMode = Boolean(
    currentUser?.is_emergency === 1 ||
      currentSession?.is_emergency === 1 ||
      messages.some((m) => m.structured?.isEmergency)
  );

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isConversationClosed = Boolean(
    !reopenedClosedChat &&
      (currentSession?.status === 'completed' ||
        lastMessage?.structured?.isClosing)
  );

  const activeEmergencyWarning =
    currentUser?.emergency_warning_ai ||
    messages.findLast((m) => m.structured?.emergencyWarning)?.structured
      ?.emergencyWarning ||
    'PERINGATAN DARURAT AI: Sistem SociaCare AI mendeteksi kamu sedang dalam kondisi darurat yang sangat berat. Keselamatanmu adalah prioritas utama kami. Mohon segera hubungi Konselor / Guru BK atau layanan darurat 119 ext 8.';

  return (
    <div
      className={`w-full h-[100dvh] flex flex-col lg:flex-row overflow-hidden transition-colors duration-500 ${
        isEmergencyMode ? 'bg-red-50 text-red-950' : 'bg-[#F5F8FC] text-[#0C2340]'
      }`}
    >
      {/* DESKTOP LEFT SIDEBAR */}
      <aside
        className={`hidden lg:flex lg:w-80 xl:w-96 h-full flex-col justify-between p-6 shrink-0 transition-colors duration-500 ${
          isEmergencyMode
            ? 'bg-gradient-to-b from-red-950 via-red-900 to-red-950 border-r border-red-800 text-white'
            : 'bg-white border-r border-[#E2EDF8]'
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-1 chat-scroll">
          {/* Brand */}
          <Link
            to="/"
            className={`flex items-center gap-3 cursor-pointer pb-4 border-b ${
              isEmergencyMode ? 'border-red-800' : 'border-[#E2EDF8]'
            }`}
          >
            <SociaHeartLogo size={36} />
            <div>
              <div
                className={`font-extrabold text-lg leading-tight tracking-tight ${
                  isEmergencyMode ? 'text-white' : 'text-[#0C2340]'
                }`}
              >
                SociaCare AI
              </div>
              <div
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isEmergencyMode ? 'text-red-300' : 'text-emerald-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isEmergencyMode
                      ? 'bg-red-400 animate-ping'
                      : 'bg-emerald-500'
                  }`}
                />
                {isEmergencyMode
                  ? 'MODE GAWAT DARURAT'
                  : 'Konselor Sebaya Aktif'}
              </div>
            </div>
          </Link>

          {/* Active User Card */}
          {currentUser && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                isEmergencyMode
                  ? 'bg-red-900/60 border-red-700 text-white'
                  : 'bg-[#F8FBFE] border-[#D1E3F5] text-[#0C2340]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <StudentAvatar
                  style={currentUser.avatar_style || 'student-female'}
                  size={38}
                />
                <div className="min-w-0">
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isEmergencyMode ? 'text-red-300' : 'text-[#64748B]'
                    }`}
                  >
                    Profil Siswa
                  </div>
                  <div className="font-extrabold text-sm truncate">
                    {currentUser.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`text-xs font-bold hover:underline shrink-0 cursor-pointer ${
                  isEmergencyMode ? 'text-red-200' : 'text-[#1B5299]'
                }`}
              >
                Ganti
              </button>
            </div>
          )}

          {/* Active Session Info Card */}
          {currentSession && (
            <div
              className={`p-4 rounded-2xl border space-y-2.5 ${
                isEmergencyMode
                  ? 'bg-red-900/40 border-red-700 text-white'
                  : 'bg-[#F0F5FA] border-[#D1E3F5] text-[#0C2340]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isEmergencyMode ? 'text-red-300' : 'text-[#64748B]'
                  }`}
                >
                  Fokus Topik Sesi
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    isConversationClosed
                      ? 'bg-emerald-100 text-emerald-800'
                      : isEmergencyMode
                      ? 'bg-red-700 text-white animate-pulse'
                      : 'bg-[#EBF3FC] text-[#1B5299]'
                  }`}
                >
                  {isConversationClosed
                    ? 'Selesai'
                    : isEmergencyMode
                    ? '🚨 Darurat'
                    : 'Berjalan'}
                </span>
              </div>
              <div className="font-extrabold text-sm leading-snug">
                {currentSession.topic_title}
              </div>
              <div
                className={`text-xs leading-relaxed ${
                  isEmergencyMode ? 'text-red-200' : 'text-[#3E5771]'
                }`}
              >
                {currentSession.topic_prompt}
              </div>
            </div>
          )}

          {/* Quick Action Navigation */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/topics')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                isEmergencyMode
                  ? 'bg-red-900/70 hover:bg-red-800 text-white border-red-700'
                  : 'bg-[#EBF3FC] hover:bg-[#D8EAF9] text-[#0C2340] border-[#D1E3F5]'
              }`}
            >
              <span className="flex items-center gap-2">
                <PlusCircle size={15} className="text-[#1B5299]" />
                Pilih Topik Baru
              </span>
              <span className="text-[10px] font-extrabold">→</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/extras')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                isEmergencyMode
                  ? 'bg-red-900/50 hover:bg-red-800 text-white border-red-700'
                  : 'bg-white hover:bg-[#F5F8FC] text-[#0C2340] border-[#E2EDF8]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Grid size={15} className="text-[#1B5299]" />
                Buka Fitur Lainnya
              </span>
              <span className="text-[10px] font-semibold text-[#64748B]">Tips • BK</span>
            </button>
          </div>

          {/* Past Sessions List */}
          <div className="space-y-2 pt-2">
            <div
              className={`text-xs font-extrabold flex items-center justify-between ${
                isEmergencyMode ? 'text-red-300' : 'text-[#64748B]'
              }`}
            >
              <span>Riwayat Sesi Tersimpan ({userSessions.length})</span>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 chat-scroll">
              {userSessions.length === 0 ? (
                <div
                  className={`text-xs p-3 rounded-xl border text-center ${
                    isEmergencyMode
                      ? 'border-red-800 text-red-300'
                      : 'border-[#E2EDF8] text-[#94A3B8]'
                  }`}
                >
                  Belum ada sesi tersimpan.
                </div>
              ) : (
                userSessions.map((s) => {
                  const isCurrent = String(s.id) === String(sessionId);
                  return (
                    <div
                      key={s.id}
                      onClick={() => navigate(`/chat/${s.id}`)}
                      className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition border ${
                        isCurrent
                          ? isEmergencyMode
                            ? 'bg-red-800 text-white font-bold border-red-500'
                            : 'bg-[#1B5299] text-white font-bold border-[#1B5299] shadow-soft'
                          : isEmergencyMode
                          ? 'bg-red-950/40 hover:bg-red-900 text-red-200 border-red-900'
                          : 'bg-white hover:bg-[#F5F8FC] text-[#0C2340] border-[#E2EDF8]'
                      }`}
                    >
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate">{s.topic_title}</div>
                        <div
                          className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                            isCurrent
                              ? 'text-blue-100'
                              : isEmergencyMode
                              ? 'text-red-300'
                              : 'text-[#64748B]'
                          }`}
                        >
                          <Clock size={10} />
                          <span>{s.message_count} pesan</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className={`p-1 rounded hover:bg-red-600/30 transition shrink-0 ${
                          isCurrent
                            ? 'text-white'
                            : isEmergencyMode
                            ? 'text-red-300'
                            : 'text-slate-400'
                        }`}
                        title="Hapus Sesi"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Sidebar Action (Logout) */}
        <div
          className={`pt-4 border-t flex items-center justify-between ${
            isEmergencyMode ? 'border-red-800' : 'border-[#E2EDF8]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              handleLogoutProfile();
              navigate('/');
            }}
            className={`flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
              isEmergencyMode
                ? 'text-red-300 hover:text-white'
                : 'text-[#64748B] hover:text-red-600'
            }`}
          >
            <LogOut size={15} />
            <span>Keluar Akun</span>
          </button>
          <span
            className={`text-[10px] ${
              isEmergencyMode ? 'text-red-400' : 'text-[#94A3B8]'
            }`}
          >
            SociaCare v1.0
          </span>
        </div>
      </aside>

      {/* MAIN FULL-HEIGHT CHAT WORKSPACE */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 relative">
        {/* Chat Header */}
        <header
          className={`flex items-center justify-between px-4 sm:px-8 lg:px-10 py-3.5 border-b shrink-0 relative z-20 transition-colors duration-500 shadow-soft ${
            isEmergencyMode
              ? 'bg-gradient-to-r from-red-900 via-red-700 to-red-800 border-red-950 text-white shadow-md'
              : 'bg-white/95 backdrop-blur-md border-[#E2EDF8]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/topics" className="lg:hidden p-1.5 -ml-1 text-[#3E5771] hover:bg-[#EBF3FC] rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <SociaHeartLogo size={36} className="shrink-0 lg:hidden" />
            <div className="leading-tight min-w-0">
              <div
                className={`font-extrabold text-base sm:text-lg truncate flex items-center gap-2 tracking-tight ${
                  isEmergencyMode ? 'text-white' : 'text-[#0C2340]'
                }`}
              >
                {isEmergencyMode && (
                  <span className="inline-flex items-center gap-1 bg-white text-red-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full animate-pulse shrink-0">
                    🚨 DARURAT
                  </span>
                )}
                <span className="truncate">
                  {currentSession?.topic_title || 'SociaCare AI'}
                </span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  isEmergencyMode ? 'text-red-100' : 'text-emerald-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                    isEmergencyMode ? 'bg-amber-300' : 'bg-emerald-500'
                  }`}
                />
                <span>
                  {isEmergencyMode
                    ? 'Mode Perlindungan Gawat Darurat Aktif • Admin & Konselor Diberitahu'
                    : 'SociaCare AI • Sahabat Konseling Aktif'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Menu Action + Close Conversation Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Mobile History Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition cursor-pointer ${
                isEmergencyMode
                  ? 'text-white hover:bg-red-800'
                  : 'text-[#3E5771] hover:bg-[#EBF3FC]'
              }`}
              title="Riwayat Sesi Konseling"
            >
              <Clock size={19} />
            </button>

            {!isConversationClosed && (
              <button
                type="button"
                disabled={sendingMessage}
                onClick={() =>
                  handleSendMessage('Saya ingin menutup pembicaraan ini, terima kasih.')
                }
                className={`text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                  isEmergencyMode
                    ? 'bg-red-950/60 hover:bg-red-950 text-white border-red-400'
                    : 'bg-[#F0F5FA] hover:bg-[#1B5299] text-[#1B5299] hover:text-white border-[#D1E3F5]'
                }`}
                title="Minta AI Menutup Pembicaraan"
              >
                <CheckCircle size={14} />
                <span className="hidden sm:inline">Tutup Pembicaraan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setChatMenuOpen((prev) => !prev)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isEmergencyMode
                  ? 'text-white hover:bg-red-800'
                  : 'text-[#3E5771] hover:bg-[#EBF3FC]'
              }`}
              title="Menu Opsi"
            >
              <MoreVertical size={20} />
            </button>

            {chatMenuOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-[#B8D4F2] rounded-2xl shadow-xl py-1.5 z-30 text-xs sm:text-sm font-semibold text-[#163A5F]">
                <button
                  type="button"
                  onClick={() => {
                    setChatMenuOpen(false);
                    navigate('/topics');
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#EBF4FC] flex items-center gap-2.5 cursor-pointer"
                >
                  <PlusCircle size={16} className="text-[#1E5FA8]" />
                  <span>Pilih Topik Baru</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatMenuOpen(false);
                    navigate('/extras');
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#EBF4FC] flex items-center gap-2.5 cursor-pointer"
                >
                  <Grid size={16} className="text-[#1E5FA8]" />
                  <span>Fitur Lainnya</span>
                </button>
                {!isConversationClosed && (
                  <button
                    type="button"
                    onClick={() => {
                      setChatMenuOpen(false);
                      handleSendMessage(
                        'Saya ingin menutup pembicaraan ini, terima kasih.'
                      );
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#EBF4FC] flex items-center gap-2.5 cursor-pointer"
                  >
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span>Tutup Pembicaraan (Oleh AI)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setChatMenuOpen(false);
                    navigate('/closing');
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-[#EBF4FC] flex items-center gap-2.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} className="text-[#1E5FA8]" />
                  <span>Halaman Penutup</span>
                </button>
                <div className="my-1 border-t border-[#E6F1FC]" />
                <button
                  type="button"
                  onClick={() => {
                    setChatMenuOpen(false);
                    handleLogoutProfile();
                    navigate('/');
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Ganti Profil Pengguna</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* PERSISTENT RED AI EMERGENCY WARNING BANNER AT TOP OF CHAT */}
        {isEmergencyMode && (
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white px-4 sm:px-8 lg:px-14 py-3.5 border-b-2 border-red-900 shadow-md shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={22}
                  className="text-amber-300 shrink-0 mt-0.5 animate-bounce"
                />
                <div className="text-xs sm:text-sm leading-snug">
                  <div className="font-extrabold uppercase tracking-wide text-amber-200">
                    ⚠️ Peringatan Darurat Berbasis AI — Kondisi Kritis Terdeteksi
                  </div>
                  <p className="font-medium text-white mt-0.5">
                    {activeEmergencyWarning}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBkForm((prev) => ({
                      ...prev,
                      urgency: 'darurat',
                      message:
                        prev.message ||
                        'DARURAT: Saya sedang dalam kondisi sangat berat dan butuh bantuan konselor segera.',
                    }));
                    navigate('/extras/counselor');
                  }}
                  className="bg-white hover:bg-red-50 text-red-800 font-extrabold text-xs px-4 py-2.5 rounded-full shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PhoneCall size={14} />
                  <span>Hubungi Guru BK Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Chat Area */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto min-h-0 px-4 sm:px-8 lg:px-14 py-6 chat-scroll ${
            isEmergencyMode ? 'bg-red-50/50' : 'bg-[#F5F8FC]'
          }`}
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Initial Welcome Banner inside Workspace */}
            <div
              className={`rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 border shadow-soft ${
                isEmergencyMode
                  ? 'bg-red-100 border-red-300 text-red-950'
                  : 'bg-white border-[#D1E3F5] text-[#0C2340]'
              }`}
            >
              <SociaHeartLogo size={36} className="shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed space-y-1">
                <div className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                  {currentUser ? `Halo, ${currentUser.name}! ` : 'Halo! '}
                  Ruang Konseling SociaCare AI Siap Mendengarkan
                </div>
                <p
                  className={isEmergencyMode ? 'text-red-900' : 'text-[#3E5771]'}
                >
                  Ceritakan apa yang sedang terjadi, bagaimana perasaanmu, atau
                  hal apa yang membuatmu bingung. Semua cerita kamu dijaga
                  dengan aman dan nyaman di sini.
                </p>
              </div>
            </div>

            {loadingSession && (
              <div className="text-center py-8 text-xs text-[#64748B] flex items-center justify-center gap-2">
                <Sparkles size={16} className="animate-spin text-[#1B5299]" />
                <span>Memuat sesi percakapan...</span>
              </div>
            )}

            {/* Render Chat Messages */}
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              const struct = msg.structured || {};
              const isLastAiMessage =
                !isUser &&
                idx === messages.map((m) => m.sender).lastIndexOf('ai');

              if (isUser) {
                return (
                  <div
                    key={msg.id || idx}
                    className="flex items-start justify-end gap-3"
                  >
                    <div
                      className={`rounded-2xl rounded-tr-xs px-4 sm:px-5 py-3.5 text-xs sm:text-sm md:text-base max-w-[85%] sm:max-w-[75%] leading-relaxed shadow-soft ${
                        isEmergencyMode
                          ? 'bg-red-700 text-white font-medium'
                          : 'bg-[#1B5299] text-white font-medium'
                      }`}
                    >
                      {/* Message Content (Dynamic formatting / Markdown support) */}
                      <div className="space-y-1 text-xs sm:text-sm md:text-base leading-relaxed">
                        {formatChatMessageText(
                          msg.content || struct.footerText || 'Aku mendengarkanmu. Ada yang ingin kamu tanyakan atau ceritakan lagi?'
                        )}
                      </div>
                    </div>
                    <StudentAvatar
                      style={currentUser?.avatar_style || 'student-female'}
                      size={34}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={msg.id || idx}
                  className="flex items-start gap-3"
                >
                  <SociaHeartLogo size={36} className="shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3 max-w-[88%] sm:max-w-[76%]">
                    <div
                      className={`bg-white rounded-2xl rounded-tl-xs p-5 sm:p-6 text-xs sm:text-sm md:text-base leading-relaxed shadow-soft space-y-4 border ${
                        struct.isEmergency || isEmergencyMode
                          ? 'border-red-500 text-red-950'
                          : 'border-[#D1E3F5] text-[#0C2340]'
                      }`}
                    >
                      {/* AI Emergency Warning Alert Box inside Bubble */}
                      {struct.isEmergency && struct.emergencyWarning && (
                        <div className="bg-red-600 text-white rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm">
                          <AlertTriangle
                            size={20}
                            className="text-amber-300 shrink-0 mt-0.5"
                          />
                          <div className="text-xs sm:text-sm leading-relaxed">
                            <div className="font-extrabold uppercase tracking-wider text-amber-200 text-[11px]">
                              🚨 Peringatan Gawat Darurat AI
                            </div>
                            <div className="font-semibold mt-0.5">
                              {struct.emergencyWarning}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Closing Badge inside Bubble */}
                      {struct.isClosing && (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold px-3 py-1 rounded-full">
                          <CheckCircle2 size={14} />
                          <span>Pembicaraan Ditutup oleh SociaCare AI</span>
                        </div>
                      )}

                      {/* Message Content (Dynamic formatting / Markdown support) */}
                      <div className="space-y-1 text-xs sm:text-sm md:text-base leading-relaxed">
                        {formatChatMessageText(
                          msg.content || struct.footerText || 'Aku mendengarkanmu. Ada yang ingin kamu tanyakan atau ceritakan lagi?'
                        )}
                      </div>

                      {/* Checkmark Solution Items */}
                      {Array.isArray(struct.checklist) &&
                        struct.checklist.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            {struct.checklist.map((item, cIdx) => (
                              <div
                                key={cIdx}
                                className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                                  struct.isEmergency || isEmergencyMode
                                    ? 'bg-red-50/70 border-red-200 text-red-950'
                                    : 'bg-[#F8FBFE] border-[#E2EDF8] text-[#0C2340]'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                                    struct.isEmergency || isEmergencyMode
                                      ? 'bg-red-600'
                                      : 'bg-[#1B5299]'
                                  }`}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </span>
                                <span className="text-xs sm:text-sm md:text-base leading-snug font-medium">
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Gentle Amber Lightbulb "Tips Tambahan" Box */}
                      {struct.tipBox && struct.tipBox.text && (
                        <div
                          className={`rounded-2xl p-4 flex items-start gap-3 border shadow-2xs ${
                            struct.isEmergency || isEmergencyMode
                              ? 'bg-red-50 border-red-200'
                              : 'bg-[#FFF8EE] border-[#FDE68A]'
                          }`}
                        >
                          <span className="text-xl leading-none shrink-0 mt-0.5">
                            💡
                          </span>
                          <div className="text-xs sm:text-sm leading-relaxed">
                            <div
                              className={`font-extrabold ${
                                struct.isEmergency || isEmergencyMode
                                  ? 'text-red-900'
                                  : 'text-[#92400E]'
                              }`}
                            >
                              {struct.tipBox.title || 'Tips Tambahan:'}
                            </div>
                            <p
                              className={`mt-1 font-medium ${
                                struct.isEmergency || isEmergencyMode
                                  ? 'text-red-800'
                                  : 'text-[#78350F]'
                              }`}
                            >
                              {struct.tipBox.text}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Infographic Visual Card inside Message Bubble */}
                      {struct.infographic && struct.infographic.url && (
                        <div className="rounded-2xl border-2 border-[#BBD7F6] overflow-hidden bg-gradient-to-b from-[#F0F7FF] to-white shadow-xs space-y-3">
                          <div className="p-3 sm:p-3.5 pb-2 flex items-center justify-between border-b border-[#D8E8F8]">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-lg bg-[#1E5FA8] text-white">
                                <ImageIcon size={14} />
                              </span>
                              <span className="text-xs font-extrabold text-[#163A5F]">
                                Infografis Edukasi Visual
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold bg-[#DCEBFA] text-[#1E5FA8] px-2.5 py-0.5 rounded-full">
                              {struct.infographic.category || 'Panduan Bimbingan'}
                            </span>
                          </div>

                          <div className="px-3 sm:px-3.5">
                            <div className="font-extrabold text-xs sm:text-sm text-[#163A5F]">
                              {struct.infographic.title}
                            </div>
                            {struct.infographic.caption && (
                              <p className="text-[11px] sm:text-xs text-[#4A6382] mt-0.5">
                                {struct.infographic.caption}
                              </p>
                            )}
                          </div>

                          {/* Clickable Image Preview */}
                          <div
                            onClick={() => setPreviewImage(struct.infographic)}
                            className="relative group cursor-pointer mx-3 sm:mx-3.5 rounded-xl overflow-hidden border border-[#C5DDF6] bg-white shadow-2xs"
                          >
                            <img
                              src={struct.infographic.url}
                              alt={struct.infographic.title}
                              className="w-full max-h-56 object-cover object-top transition duration-300 group-hover:scale-102"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-[#163A5F]/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-[2px]">
                              <div className="bg-white/95 text-[#163A5F] text-xs font-extrabold px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                                <ZoomIn size={14} />
                                <span>Klik untuk Perbesar</span>
                              </div>
                            </div>
                          </div>

                          <div className="px-3 sm:px-3.5 pb-3 sm:pb-3.5 flex items-center justify-between text-xs font-semibold pt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewImage(struct.infographic)}
                              className="text-[#1E5FA8] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <ZoomIn size={13} />
                              <span>Tampilan Penuh</span>
                            </button>
                            <a
                              href={sanitizeSafeUrl(struct.infographic.url)}
                              download={struct.infographic.downloadName || 'infografis-sociacare.svg'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4A6382] hover:text-[#163A5F] flex items-center gap-1 cursor-pointer"
                              title="Buka / Simpan File Gambar"
                            >
                              <Download size={13} />
                              <span>Simpan Gambar</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Footer Question / Closing Text */}
                      {struct.footerText && (
                        <p
                          className={`pt-0.5 font-semibold ${
                            struct.isEmergency || isEmergencyMode
                              ? 'text-red-900'
                              : 'text-[#163A5F]'
                          }`}
                        >
                          {struct.footerText}
                        </p>
                      )}
                    </div>

                    {/* Quick Reply Pill Buttons */}
                    {isLastAiMessage &&
                      Array.isArray(struct.quickReplies) &&
                      struct.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {struct.quickReplies.map((qr, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              disabled={sendingMessage}
                              onClick={() => handleSendMessage(qr)}
                              className={`font-bold text-xs sm:text-sm px-4 py-2 rounded-full transition shadow-soft cursor-pointer border ${
                                isEmergencyMode
                                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                                  : 'bg-white hover:bg-[#1B5299] text-[#1B5299] hover:text-white border-[#D1E3F5]'
                              }`}
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            {sendingMessage && (
              <div className="flex items-center gap-3">
                <SociaHeartLogo size={34} />
                <div
                  className={`bg-white border rounded-2xl px-4 py-3 text-xs sm:text-sm flex items-center gap-2 shadow-soft ${
                    isEmergencyMode
                      ? 'border-red-300 text-red-800'
                      : 'border-[#D1E3F5] text-[#64748B]'
                  }`}
                >
                  <Sparkles
                    size={16}
                    className={`animate-spin ${
                      isEmergencyMode ? 'text-red-600' : 'text-[#1B5299]'
                    }`}
                  />
                  <span>SociaCare AI sedang merumuskan tanggapan...</span>
                </div>
              </div>
            )}

            {chatError && (
              <div className="bg-red-50 border border-red-300 text-red-900 rounded-2xl p-4 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-red-800">
                      Gagal Mendapatkan Balasan AI
                    </div>
                    <p className="text-red-700 leading-relaxed">{chatError.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {chatError.failedText && (
                    <button
                      type="button"
                      disabled={sendingMessage}
                      onClick={() => handleSendMessage(chatError.failedText)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Coba Kirim Ulang
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatError(null)}
                    className="p-1.5 rounded-xl text-red-500 hover:bg-red-100 transition cursor-pointer"
                    title="Tutup pesan error"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Bar OR Closed Conversation State */}
        <div
          className={`px-3 sm:px-8 lg:px-14 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t shrink-0 transition-colors duration-500 shadow-soft ${
            isEmergencyMode
              ? 'bg-red-100/90 border-red-300'
              : 'bg-white/95 backdrop-blur-md border-[#E2EDF8]'
          }`}
        >
          {isConversationClosed ? (
            <div className="max-w-4xl mx-auto bg-[#F8FBFE] border border-[#D1E3F5] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-soft">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#0C2340]">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>
                  Sesi pembicaraan ini telah ditutup oleh SociaCare AI. Terima kasih sudah berbagi cerita hari ini!
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/closing')}
                  className="bg-[#1B5299] hover:bg-[#133E75] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-soft"
                >
                  Pesan Penutup 💙
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/topics')}
                  className="bg-white hover:bg-[#F0F5FA] text-[#0C2340] border border-[#D1E3F5] text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  + Topik Baru
                </button>
                <button
                  type="button"
                  onClick={() => setReopenedClosedChat(true)}
                  className="text-xs font-bold text-[#64748B] hover:text-[#0C2340] px-2 py-1.5 underline cursor-pointer"
                >
                  Buka Lagi
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-4xl mx-auto flex items-center gap-2.5 sm:gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  sendingMessage
                    ? 'SociaCare AI sedang merumuskan balasan...'
                    : isEmergencyMode
                    ? 'Ceritakan apa yang kamu rasakan saat ini...'
                    : 'Ketik ceritamu di sini...'
                }
                disabled={sendingMessage}
                className={`flex-1 bg-[#F5F8FC] border rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-sm text-[#0C2340] placeholder-[#94A3B8] focus:bg-white focus:outline-none transition shadow-2xs ${
                  isEmergencyMode
                    ? 'border-red-400 text-red-950 placeholder-red-400 focus:border-red-700'
                    : 'border-[#D1E3F5] text-[#0C2340] placeholder-[#94A3B8] focus:border-[#1B5299]'
                }`}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingMessage}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow-soft transition cursor-pointer ${
                  isEmergencyMode
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#1B5299] hover:bg-[#133E75]'
                }`}
                title="Kirim Pesan"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* MOBILE SESSIONS & PROFILE DRAWER (Slide-over for phones) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative w-full max-w-xs bg-white h-full flex flex-col justify-between p-5 z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-5 overflow-y-auto pr-1 chat-scroll">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2EDF8]">
                <div className="flex items-center gap-2.5">
                  <SociaHeartLogo size={32} />
                  <div>
                    <div className="font-extrabold text-base text-[#0C2340]">SociaCare AI</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Konseling Aktif</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {currentUser && (
                <div className="p-3 rounded-2xl bg-[#F8FBFE] border border-[#D1E3F5] flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StudentAvatar style={currentUser.avatar_style || 'student-female'} size={36} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Siswa</div>
                      <div className="font-extrabold text-sm truncate text-[#0C2340]">{currentUser.name}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      navigate('/');
                    }}
                    className="text-xs font-bold text-[#1B5299] hover:underline shrink-0"
                  >
                    Ganti
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    navigate('/topics');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border bg-[#EBF3FC] text-[#0C2340] border-[#D1E3F5]"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle size={15} className="text-[#1B5299]" />
                    Pilih Topik Baru
                  </span>
                  <span className="text-[10px] font-extrabold">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    navigate('/extras');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border bg-white text-[#0C2340] border-[#E2EDF8]"
                >
                  <span className="flex items-center gap-2">
                    <Grid size={15} className="text-[#1B5299]" />
                    Fitur Lainnya
                  </span>
                  <span className="text-[10px] font-semibold text-[#64748B]">Tips • BK</span>
                </button>
              </div>

              {/* Sessions List */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-extrabold text-[#64748B] flex items-center justify-between">
                  <span>Riwayat Sesi Tersimpan ({userSessions.length})</span>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 chat-scroll">
                  {userSessions.length === 0 ? (
                    <div className="text-xs p-3 rounded-xl border border-[#E2EDF8] text-[#94A3B8] text-center">
                      Belum ada sesi tersimpan.
                    </div>
                  ) : (
                    userSessions.map((s) => {
                      const isCurrent = String(s.id) === String(sessionId);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setMobileDrawerOpen(false);
                            navigate(`/chat/${s.id}`);
                          }}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition border ${
                            isCurrent
                              ? 'bg-[#1B5299] text-white font-bold border-[#1B5299]'
                              : 'bg-white hover:bg-[#F5F8FC] text-[#0C2340] border-[#E2EDF8]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <div className="truncate">{s.topic_title}</div>
                            <div
                              className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                                isCurrent ? 'text-blue-100' : 'text-[#64748B]'
                              }`}
                            >
                              <Clock size={10} />
                              <span>{s.message_count} pesan</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className={`p-1 rounded transition shrink-0 ${
                              isCurrent ? 'text-white hover:bg-white/20' : 'text-slate-400 hover:text-red-500'
                            }`}
                            title="Hapus Sesi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2EDF8] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleLogoutProfile();
                  navigate('/');
                }}
                className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-red-600 transition"
              >
                <LogOut size={15} />
                <span>Keluar Akun</span>
              </button>
              <span className="text-[10px] text-[#94A3B8]">SociaCare v1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Infographic Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E3EFFC] flex items-center justify-between bg-white shrink-0">
              <div>
                <span className="text-xs font-bold text-[#1E5FA8] bg-[#E8F2FC] px-2.5 py-0.5 rounded-full">
                  {previewImage.category}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-[#163A5F] mt-1">
                  {previewImage.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-[#4A6382] hover:text-slate-900 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-[#CFE3F8]"
              />
            </div>
            <div className="p-3.5 border-t border-[#E3EFFC] flex flex-col sm:flex-row items-center justify-between gap-2 bg-white text-xs shrink-0">
              <span className="text-[#4A6382] text-center sm:text-left">
                {previewImage.caption}
              </span>
              <a
                href={sanitizeSafeUrl(previewImage.url)}
                download={previewImage.downloadName || 'infografis-sociacare.svg'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold px-4 py-2 rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Download size={14} />
                <span>Unduh Gambar (SVG)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
