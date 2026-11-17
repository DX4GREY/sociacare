import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

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
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [reopenedClosedChat, setReopenedClosedChat] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  const messagesContainerRef = useRef(null);
  const loadedSessionIdRef = useRef(null);
  const creatingDefaultRef = useRef(false);
  const isInitialLoad = useRef(true);

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
      const res = await fetch(`/api/sessions/${idToLoad}${userIdParam}`);
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
      const res = await fetch(`/api/sessions/${currentSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend }),
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
      // Sinkronkan ulang data pesan dari database jika request sempat terputus di jaringan
      if (currentSession?.id) {
        try {
          const activeUser =
            currentUser ||
            JSON.parse(localStorage.getItem('sociacare_user') || 'null');
          const userIdParam = activeUser?.id
            ? `?userId=${encodeURIComponent(activeUser.id)}`
            : '';
          const syncRes = await fetch(
            `/api/sessions/${currentSession.id}${userIdParam}`
          );
          const syncData = await syncRes.json();
          if (syncData.messages && syncData.messages.length > 0) {
            setMessages(syncData.messages);
            if (syncData.session) setCurrentSession(syncData.session);
          }
        } catch (syncErr) {
          console.warn('Sync fallback error:', syncErr);
        }
      }
    } finally {
      setSendingMessage(false);
    }
  }

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
        isEmergencyMode ? 'bg-red-50 text-red-950' : 'bg-[#F4F9FF] text-[#1E2F47]'
      }`}
    >
      {/* DESKTOP LEFT SIDEBAR */}
      <aside
        className={`hidden lg:flex lg:w-80 xl:w-96 h-full flex-col justify-between p-6 shrink-0 transition-colors duration-500 ${
          isEmergencyMode
            ? 'bg-gradient-to-b from-red-950 via-red-900 to-red-950 border-r border-red-800 text-white'
            : 'bg-white border-r border-[#D5E6F7]'
        }`}
      >
        <div className="space-y-6 overflow-y-auto pr-1 chat-scroll">
          {/* Brand */}
          <Link
            to="/"
            className={`flex items-center gap-3 cursor-pointer pb-4 border-b ${
              isEmergencyMode ? 'border-red-800' : 'border-[#E6F1FC]'
            }`}
          >
            <SociaHeartLogo size={36} />
            <div>
              <div
                className={`font-extrabold text-lg leading-tight ${
                  isEmergencyMode ? 'text-white' : 'text-[#163A5F]'
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
                  : 'bg-[#EBF4FD] border-[#C5DDF6] text-[#163A5F]'
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
                      isEmergencyMode ? 'text-red-300' : 'text-[#4A6382]'
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
                  isEmergencyMode ? 'text-red-200' : 'text-[#1E5FA8]'
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
                  : 'bg-[#F2F8FF] border-[#C5DDF6] text-[#163A5F]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isEmergencyMode ? 'text-red-300' : 'text-[#4A6382]'
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
                      : 'bg-[#DCEBFA] text-[#1E5FA8]'
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
                  isEmergencyMode ? 'text-red-200' : 'text-[#4A6382]'
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
                  : 'bg-[#EBF4FD] hover:bg-[#DCEBFA] text-[#163A5F] border-[#B8D4F2]'
              }`}
            >
              <span className="flex items-center gap-2">
                <PlusCircle size={15} />
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
                  : 'bg-white hover:bg-[#F2F7FC] text-[#244B75] border-[#D5E6F7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Grid size={15} />
                Buka Fitur Lainnya
              </span>
              <span className="text-[10px] font-semibold">Tips • BK</span>
            </button>
          </div>

          {/* Past Sessions List */}
          <div className="space-y-2 pt-2">
            <div
              className={`text-xs font-extrabold flex items-center justify-between ${
                isEmergencyMode ? 'text-red-300' : 'text-[#4A6382]'
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
                      : 'border-[#E6F1FC] text-[#7B96B2]'
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
                            : 'bg-[#1E5FA8] text-white font-bold border-[#1E5FA8]'
                          : isEmergencyMode
                          ? 'bg-red-950/40 hover:bg-red-900 text-red-200 border-red-900'
                          : 'bg-white hover:bg-[#EBF4FC] text-[#163A5F] border-[#E6F1FC]'
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
                              : 'text-[#7B96B2]'
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
            isEmergencyMode ? 'border-red-800' : 'border-[#E6F1FC]'
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
                : 'text-[#4A6382] hover:text-red-600'
            }`}
          >
            <LogOut size={15} />
            <span>Keluar Akun</span>
          </button>
          <span
            className={`text-[10px] ${
              isEmergencyMode ? 'text-red-400' : 'text-[#7B96B2]'
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
          className={`flex items-center justify-between px-4 sm:px-8 lg:px-10 py-3.5 border-b shrink-0 relative z-20 transition-colors duration-500 ${
            isEmergencyMode
              ? 'bg-gradient-to-r from-red-900 via-red-700 to-red-800 border-red-950 text-white shadow-md'
              : 'bg-white/95 border-[#D5E6F7]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/topics" className="lg:hidden p-1.5 -ml-1 text-[#2B547E] hover:bg-[#E3EFFC] rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <SociaHeartLogo size={36} className="shrink-0 lg:hidden" />
            <div className="leading-tight min-w-0">
              <div
                className={`font-extrabold text-base sm:text-lg truncate flex items-center gap-2 ${
                  isEmergencyMode ? 'text-white' : 'text-[#163A5F]'
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
                    : 'SociaCare AI • Online'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Menu Action + Close Conversation Button */}
          <div className="flex items-center gap-2 relative">
            {!isConversationClosed && (
              <button
                type="button"
                disabled={sendingMessage}
                onClick={() =>
                  handleSendMessage('Saya ingin menutup pembicaraan ini, terima kasih.')
                }
                className={`text-xs font-bold px-3.5 py-2 rounded-full border flex items-center gap-1.5 transition cursor-pointer ${
                  isEmergencyMode
                    ? 'bg-red-950/60 hover:bg-red-950 text-white border-red-400'
                    : 'bg-[#F0F7FF] hover:bg-[#1E5FA8] text-[#184B78] hover:text-white border-[#B8D4F2]'
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
                  : 'text-[#2B547E] hover:bg-[#E3EFFC]'
              }`}
              title="Menu Opsi"
            >
              <MoreVertical size={22} />
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
            isEmergencyMode ? 'bg-red-50/50' : 'bg-[#F8FBFF]'
          }`}
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Initial Welcome Banner inside Workspace */}
            <div
              className={`rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 border ${
                isEmergencyMode
                  ? 'bg-red-100 border-red-300 text-red-950'
                  : 'bg-white border-[#D5E6F7] text-[#1E3A5F]'
              }`}
            >
              <SociaHeartLogo size={36} className="shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed space-y-1">
                <div className="font-extrabold text-sm sm:text-base">
                  {currentUser ? `Halo, ${currentUser.name}! ` : 'Halo! '}
                  Ruang Konseling SociaCare AI Siap Mendengarkan
                </div>
                <p
                  className={isEmergencyMode ? 'text-red-900' : 'text-[#4A6382]'}
                >
                  Ceritakan apa yang sedang terjadi, bagaimana perasaanmu, atau
                  hal apa yang membuatmu bingung. Semua cerita kamu dijaga
                  dengan aman dan nyaman di sini.
                </p>
              </div>
            </div>

            {loadingSession && (
              <div className="text-center py-8 text-xs text-[#4A6382] flex items-center justify-center gap-2">
                <Sparkles size={16} className="animate-spin text-[#1E5FA8]" />
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
                      className={`rounded-2xl rounded-tr-sm px-4 sm:px-5 py-3.5 text-xs sm:text-sm md:text-base max-w-[85%] sm:max-w-[75%] leading-relaxed shadow-2xs ${
                        isEmergencyMode
                          ? 'bg-red-700 text-white font-medium'
                          : 'bg-[#1E5FA8] text-white font-medium'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.content}</p>
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
                      className={`bg-white rounded-2xl rounded-tl-sm p-4 sm:p-5 text-xs sm:text-sm md:text-base leading-relaxed shadow-2xs space-y-3.5 border-2 ${
                        struct.isEmergency || isEmergencyMode
                          ? 'border-red-500 text-red-950'
                          : 'border-[#CFE3F8] text-[#1E3A5F]'
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

                      <p className="whitespace-pre-line">{msg.content}</p>

                      {/* Checkmark Solution Items */}
                      {Array.isArray(struct.checklist) &&
                        struct.checklist.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            {struct.checklist.map((item, cIdx) => (
                              <div
                                key={cIdx}
                                className={`flex items-start gap-2.5 ${
                                  struct.isEmergency || isEmergencyMode
                                    ? 'text-red-950'
                                    : 'text-[#1E3A5F]'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                                    struct.isEmergency || isEmergencyMode
                                      ? 'bg-red-600'
                                      : 'bg-[#2563EB]'
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

                      {/* Yellow Lightbulb "Tips Tambahan" Box */}
                      {struct.tipBox && struct.tipBox.text && (
                        <div
                          className={`rounded-xl p-3.5 sm:p-4 flex items-start gap-3 border ${
                            struct.isEmergency || isEmergencyMode
                              ? 'bg-red-50 border-red-200'
                              : 'bg-[#F0F7FF] border-[#BBD7F6]'
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
                                  : 'text-[#163A5F]'
                              }`}
                            >
                              {struct.tipBox.title || 'Tips Tambahan:'}
                            </div>
                            <p
                              className={`mt-0.5 ${
                                struct.isEmergency || isEmergencyMode
                                  ? 'text-red-800'
                                  : 'text-[#2B4C6F]'
                              }`}
                            >
                              {struct.tipBox.text}
                            </p>
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
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {struct.quickReplies.map((qr, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              disabled={sendingMessage}
                              onClick={() => handleSendMessage(qr)}
                              className={`font-bold text-xs sm:text-sm px-4 py-2 rounded-full transition shadow-2xs cursor-pointer border ${
                                isEmergencyMode
                                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                                  : 'bg-[#E3EFFC] hover:bg-[#1E5FA8] text-[#184B78] hover:text-white border-[#B4D2F2]'
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
                  className={`bg-white border rounded-2xl px-4 py-3 text-xs sm:text-sm flex items-center gap-2 shadow-2xs ${
                    isEmergencyMode
                      ? 'border-red-300 text-red-800'
                      : 'border-[#CFE3F8] text-[#4A6382]'
                  }`}
                >
                  <Sparkles
                    size={16}
                    className={`animate-spin ${
                      isEmergencyMode ? 'text-red-600' : 'text-[#1E5FA8]'
                    }`}
                  />
                  <span>SociaCare AI sedang mengetik...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input Bar OR Closed Conversation State */}
        <div
          className={`px-4 sm:px-8 lg:px-14 py-3.5 sm:py-4 border-t shrink-0 transition-colors duration-500 ${
            isEmergencyMode
              ? 'bg-red-100/90 border-red-300'
              : 'bg-white/95 border-[#D5E6F7]'
          }`}
        >
          {isConversationClosed ? (
            <div className="max-w-4xl mx-auto bg-[#F0F8FF] border border-[#B8D4F2] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#163A5F]">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>
                  Sesi pembicaraan ini telah ditutup oleh SociaCare AI. Terima kasih sudah berbagi cerita hari ini!
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/closing')}
                  className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer"
                >
                  Pesan Penutup 💙
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/topics')}
                  className="bg-white hover:bg-[#E6F1FC] text-[#184B78] border border-[#B8D4F2] text-xs font-bold px-4 py-2 rounded-full transition cursor-pointer"
                >
                  + Topik Baru
                </button>
                <button
                  type="button"
                  onClick={() => setReopenedClosedChat(true)}
                  className="text-xs font-bold text-[#4A6382] hover:text-[#163A5F] px-2.5 py-1.5 underline cursor-pointer"
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
              className="max-w-4xl mx-auto flex items-center gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  sendingMessage
                    ? 'SociaCare AI sedang merumuskan balasan...'
                    : isEmergencyMode
                    ? 'Ceritakan apa yang kamu rasakan saat ini, kami mendengarkanmu...'
                    : 'Ketik pesanmu di sini...'
                }
                disabled={sendingMessage}
                className={`flex-1 bg-white border rounded-full px-5 py-3 text-xs sm:text-sm md:text-base focus:outline-none ${
                  isEmergencyMode
                    ? 'border-red-400 text-red-950 placeholder-red-400 focus:border-red-700'
                    : 'bg-[#F2F7FD] border-[#C5DDF6] text-[#163A5F] placeholder-[#7B96B2] focus:border-[#1E5FA8]'
                }`}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingMessage}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow transition cursor-pointer ${
                  isEmergencyMode
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#1E5FA8] hover:bg-[#15467E]'
                }`}
                title="Kirim Pesan"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
