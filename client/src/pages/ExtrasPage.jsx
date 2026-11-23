import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  SociaHeartLogo,
  ExtraTipsIcon,
  ExtraArticleIcon,
  ExtraVideoIcon,
  ExtraGuruBkIcon,
  ExtraHistoryIcon,
} from '../components/Illustrations';
import {
  Menu,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Send,
  Play,
  Tv,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';

export default function ExtrasPage() {
  const { tab, articleId } = useParams();
  const navigate = useNavigate();

  const {
    currentUser,
    setCurrentSession,
    userSessions,
    fetchUserSessions,
    deleteSession,
    extrasData,
    handleToggleBookmarkTip,
    counselorRequests,
    bkForm,
    setBkForm,
    bkSuccess,
    handleSubmitBkRequest,
  } = useApp();

  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [discussingLoading, setDiscussingLoading] = useState(false);

  function mapCategoryToTopicId(cat = '') {
    const c = String(cat).toLowerCase();
    if (c.includes('komunikasi') || c.includes('asertif')) return 'communication';
    if (c.includes('percaya') || c.includes('minder') || c.includes('potensi')) return 'confidence';
    if (c.includes('bully') || c.includes('rundung') || c.includes('aman')) return 'bullying';
    return 'friendship';
  }

  async function handleDiscussInChat({ type, title, category, takeaways, excerpt }) {
    if (discussingLoading) return;
    setDiscussingLoading(true);

    try {
      let activeUser = currentUser;
      if (!activeUser) {
        try {
          const saved = localStorage.getItem('sociacare_user');
          if (saved) activeUser = JSON.parse(saved);
        } catch {}
      }

      if (!activeUser?.id) {
        navigate('/');
        return;
      }

      const topicId = mapCategoryToTopicId(category);

      let promptText = '';
      if (type === 'video') {
        const points =
          Array.isArray(takeaways) && takeaways.length > 0
            ? ` Poin penting yang kusimak: "${takeaways.slice(0, 2).join('; ')}".`
            : '';
        promptText = `Halo SociaCare AI, aku baru saja menonton video edukasi "${title}" (${category}).${points} Boleh bantu aku mendiskusikan langkah konkret yang bisa kupraktikkan di sekolah?`;
      } else {
        const summaryContext = excerpt ? ` Inti bahasan: "${excerpt}".` : '';
        promptText = `Halo SociaCare AI, aku baru saja membaca artikel "${title}" (${category}).${summaryContext} Aku ingin mendiskusikan isi artikel ini dan meminta saran bagaimana menerapkannya dalam hubunganku di sekolah.`;
      }

      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/users/${activeUser.id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': devToken,
        },
        body: JSON.stringify({ topicId, deviceToken: devToken }),
      });

      const data = await res.json();
      if (data.session) {
        setCurrentSession(data.session);
        await fetchUserSessions(activeUser.id);
        if (selectedVideo) setSelectedVideo(null);
        navigate(`/chat/${data.session.id}`, {
          state: { autoSendText: promptText },
        });
        return;
      }

      // Fallback: If session creation fails, fallback to userSessions or /topics
      if (userSessions.length > 0) {
        if (selectedVideo) setSelectedVideo(null);
        navigate(`/chat/${userSessions[0].id}`, {
          state: { autoSendText: promptText },
        });
      } else {
        navigate('/topics');
      }
    } catch (err) {
      console.error('Failed to initiate discuss session:', err);
      if (userSessions.length > 0) {
        if (selectedVideo) setSelectedVideo(null);
        navigate(`/chat/${userSessions[0].id}`);
      } else {
        navigate('/topics');
      }
    } finally {
      setDiscussingLoading(false);
    }
  }

  // Map route params to active tab
  const activeTab = articleId
    ? 'articles'
    : tab === 'gurubk'
    ? 'counselor'
    : tab || null;

  useEffect(() => {
    if (articleId && extrasData.articles.length > 0) {
      const art = extrasData.articles.find((a) => String(a.id) === String(articleId));
      if (art) setSelectedArticle(art);
    } else if (!articleId && !selectedArticle) {
      setSelectedArticle(null);
    }
  }, [articleId, extrasData.articles]);

  // Dynamic browser tab title
  useEffect(() => {
    if (selectedArticle?.title) {
      document.title = `${selectedArticle.title} — Artikel Edukasi | SociaCare AI`;
    } else if (activeTab === 'tips') {
      document.title = 'Tips & Solusi Sosial Siswa | SociaCare AI';
    } else if (activeTab === 'articles') {
      document.title = 'Artikel Bimbingan & Edukasi | SociaCare AI';
    } else if (activeTab === 'videos') {
      document.title = 'Video Edukasi Siswa | SociaCare AI';
    } else if (activeTab === 'counselor') {
      document.title = 'Hubungi Guru BK & Permohonan Tatap Muka | SociaCare AI';
    } else if (activeTab === 'history') {
      document.title = 'Riwayat Percakapan Konseling | SociaCare AI';
    } else {
      document.title = 'Fitur Edukasi & Bantuan Siswa | SociaCare AI';
    }
  }, [activeTab, selectedArticle?.title]);

  function handleTabClick(targetTab) {
    setSelectedArticle(null);
    if (!targetTab) {
      navigate('/extras');
    } else {
      navigate(`/extras/${targetTab}`);
    }
  }

  function handleArticleSelect(article) {
    setSelectedArticle(article);
    navigate(`/extras/articles/${article.id}`);
  }

  function handleBackFromArticle() {
    setSelectedArticle(null);
    navigate('/extras/articles');
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#F5F8FC] flex flex-col justify-between text-[#0C2340]">
      {/* Full-Width Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/90 backdrop-blur-md border-b border-[#E2EDF8] sticky top-0 z-20 shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <SociaHeartLogo size={36} />
            <div className="leading-tight">
              <div className="font-extrabold text-[#0C2340] text-base sm:text-lg tracking-tight">
                SociaCare AI
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Pusat Edukasi & Dukungan</span>
              </div>
            </div>
          </Link>

          {/* Desktop Tab Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { id: null, label: 'Semua Fitur' },
              { id: 'tips', label: 'Tips Sosial' },
              { id: 'articles', label: 'Artikel Informasi' },
              { id: 'videos', label: 'Video Edukasi' },
              { id: 'counselor', label: 'Hubungi Guru BK' },
              { id: 'history', label: 'Riwayat Chat' },
            ].map((t) => (
              <button
                key={t.id || 'all'}
                type="button"
                onClick={() => handleTabClick(t.id)}
                className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#1B5299] text-white shadow-soft'
                    : 'bg-[#F0F5FA] hover:bg-[#E5EFF9] text-[#0C2340] border border-[#D1E3F5]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab) {
                  navigate('/extras');
                } else if (userSessions.length > 0) {
                  navigate(`/chat/${userSessions[0].id}`);
                } else {
                  navigate('/topics');
                }
              }}
              className="p-2 rounded-xl text-[#3E5771] hover:bg-[#EBF3FC] transition cursor-pointer"
              title="Kembali"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Horizontal Scrollable Tab Bar */}
      <div className="md:hidden w-full overflow-x-auto chat-scroll bg-white/90 backdrop-blur-md border-b border-[#E2EDF8] px-4 py-2.5 flex items-center gap-2 shrink-0 sticky top-[65px] z-20 shadow-2xs">
        {[
          { id: null, label: 'Semua Fitur' },
          { id: 'tips', label: 'Tips Sosial' },
          { id: 'articles', label: 'Artikel' },
          { id: 'videos', label: 'Video' },
          { id: 'counselor', label: 'Hubungi BK' },
          { id: 'history', label: 'Riwayat' },
        ].map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            onClick={() => handleTabClick(t.id)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 ${
              activeTab === t.id
                ? 'bg-[#1B5299] text-white shadow-soft'
                : 'bg-[#F0F5FA] text-[#0C2340] border border-[#D1E3F5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Full-Screen Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 flex flex-col">
        {!activeTab && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="my-auto">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-xs font-bold text-[#1B5299] bg-[#EBF3FC] px-3 py-1 rounded-full border border-[#D1E3F5]">
                  Pusat Informasi & Konseling
                </span>
                <h2 className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#0C2340] tracking-tight mt-2">
                  Eksplorasi Fitur Tambahan
                </h2>
                <p className="text-xs sm:text-sm text-[#3E5771] mt-1.5 leading-relaxed">
                  Temukan tips pergaulan sehat, baca artikel psikologi remaja, tonton video inspiratif, atau ajukan jadwal bimbingan langsung dengan Guru BK.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => handleTabClick('tips')}
                  className="group bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-soft hover:shadow-float min-h-[180px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-105 transition duration-300">
                    <ExtraTipsIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                    Tips Sosial
                  </span>
                  <span className="hidden sm:block text-xs text-[#64748B] mt-1">
                    Panduan praktis pergaulan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('articles')}
                  className="group bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-soft hover:shadow-float min-h-[180px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-105 transition duration-300">
                    <ExtraArticleIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                    Artikel Informasi
                  </span>
                  <span className="hidden sm:block text-xs text-[#64748B] mt-1">
                    Edukasi psikologi remaja
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('videos')}
                  className="group bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-soft hover:shadow-float min-h-[180px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-105 transition duration-300">
                    <ExtraVideoIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                    Video Edukasi
                  </span>
                  <span className="hidden sm:block text-xs text-[#64748B] mt-1">
                    Video & animasi bimbingan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('counselor')}
                  className="group bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-soft hover:shadow-float min-h-[180px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-105 transition duration-300">
                    <ExtraGuruBkIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                    Hubungi Guru BK
                  </span>
                  <span className="hidden sm:block text-xs text-[#64748B] mt-1">
                    Jadwalkan sesi tatap muka
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('history')}
                  className="group bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-soft hover:shadow-float min-h-[180px] sm:min-h-[220px] cursor-pointer col-span-2 sm:col-span-1"
                >
                  <div className="mb-3.5 transform group-hover:scale-105 transition duration-300">
                    <ExtraHistoryIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#0C2340]">
                    Riwayat Chat
                  </span>
                  <span className="hidden sm:block text-xs text-[#1B5299] font-bold mt-1">
                    {userSessions.length} sesi tersimpan
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E2EDF8] flex items-center justify-between text-xs sm:text-sm">
              <Link
                to={userSessions.length > 0 ? `/chat/${userSessions[0].id}` : '/topics'}
                className="text-[#1B5299] font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={16} />
                {userSessions.length > 0 ? 'Kembali ke Percakapan' : 'Pilih Topik'}
              </Link>
              <Link
                to="/closing"
                className="bg-[#EBF3FC] hover:bg-[#D8EAF9] text-[#1B5299] font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Pesan Penutup ♡
              </Link>
            </div>
          </div>
        )}

        {/* TIPS SOSIAL */}
        {activeTab === 'tips' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => handleTabClick(null)}
                className="text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                Kembali ke Fitur Lainnya
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                💡 Tips Sosial
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {extrasData.tips.map((tip) => {
                const isSaved = extrasData.savedTipIds.includes(tip.id);
                return (
                  <div
                    key={tip.id}
                    className="bg-white border border-[#C5DDF6] rounded-2xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold bg-[#E6F1FC] text-[#1E5FA8] px-3 py-0.5 rounded-full">
                          {tip.category}
                        </span>
                        <h3 className="font-bold text-base sm:text-lg text-[#163A5F] mt-1.5">
                          {tip.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleBookmarkTip(tip.id)}
                        className={`p-2 rounded-full border transition cursor-pointer ${
                          isSaved
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-[#1E5FA8]'
                        }`}
                        title="Simpan Tips"
                      >
                        <Bookmark
                          size={16}
                          fill={isSaved ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-[#2B547E] font-medium">
                      {tip.summary}
                    </p>
                    <div className="space-y-2 pt-1">
                      {tip.points.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-[#243B55]"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={10} strokeWidth={3} />
                          </span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARTIKEL INFORMASI */}
        {activeTab === 'articles' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => {
                  if (selectedArticle) handleBackFromArticle();
                  else handleTabClick(null);
                }}
                className="text-xs sm:text-sm font-bold text-[#1B5299] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>
                  {selectedArticle
                    ? 'Kembali ke Daftar Artikel'
                    : 'Kembali ke Fitur Lainnya'}
                </span>
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#0C2340]">
                📖 Artikel Edukasi Siswa
              </span>
            </div>

            {selectedArticle ? (
              <article className="bg-white border-2 border-[#D1E3F5] rounded-3xl p-6 sm:p-10 max-w-4xl w-full mx-auto space-y-6 shadow-float">
                <div className="flex items-center justify-between text-xs sm:text-sm border-b border-[#E2EDF8] pb-4">
                  <span className="bg-[#EBF3FC] text-[#1B5299] font-bold px-3.5 py-1 rounded-full border border-[#D1E3F5]">
                    {selectedArticle.category}
                  </span>
                  <span className="text-[#64748B] font-semibold flex items-center gap-1">
                    <Clock size={13} />
                    {selectedArticle.readTime}
                  </span>
                </div>

                <h1 className="font-extrabold text-xl sm:text-3xl text-[#0C2340] tracking-tight leading-snug">
                  {selectedArticle.title}
                </h1>

                {selectedArticle.excerpt && (
                  <div className="text-xs sm:text-sm text-[#3E5771] font-medium leading-relaxed italic border-l-4 border-[#1B5299] pl-4 py-1 bg-[#F8FBFE] rounded-r-xl">
                    {selectedArticle.excerpt}
                  </div>
                )}

                <div className="space-y-4 text-xs sm:text-sm md:text-base text-[#0C2340] leading-relaxed pt-2">
                  {(Array.isArray(selectedArticle.content)
                    ? selectedArticle.content
                    : typeof selectedArticle.content === 'string'
                    ? selectedArticle.content.split('\n\n').filter(Boolean)
                    : [selectedArticle.excerpt || '']
                  ).map((p, i) => (
                    <p key={i} className="leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>

                <div className="pt-6 border-t border-[#E2EDF8] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B] text-center sm:text-left">
                    Punya pertanyaan atau ingin membahas isi artikel ini dengan bimbingan AI Konselor?
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        handleDiscussInChat({
                          type: 'article',
                          title: selectedArticle.title,
                          category: selectedArticle.category,
                          excerpt: selectedArticle.excerpt,
                        })
                      }
                      disabled={discussingLoading}
                      className="w-full sm:w-auto bg-[#1B5299] hover:bg-[#133E75] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-2xl shadow-soft transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <MessageSquare size={15} />
                      <span>{discussingLoading ? 'Membuka Chat...' : 'Bahas Artikel Ini di Chat AI'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/topics')}
                      className="w-full sm:w-auto bg-[#F0F5FA] hover:bg-[#E5EFF9] text-[#0C2340] border border-[#D1E3F5] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Pilih Topik Bebas</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {extrasData.articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => handleArticleSelect(art)}
                    className="bg-white hover:bg-[#F8FBFE] border-2 border-[#D1E3F5] hover:border-[#1B5299] rounded-3xl p-6 cursor-pointer transition shadow-soft hover:shadow-float flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-bold text-[#1B5299] bg-[#EBF3FC] px-3 py-1 rounded-full border border-[#D1E3F5]">
                          {art.category}
                        </span>
                        <span className="text-[#64748B] font-semibold flex items-center gap-1">
                          <Clock size={12} />
                          {art.readTime}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[#0C2340] leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#3E5771] mt-2 line-clamp-2 leading-relaxed">
                        {art.excerpt}
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-[#E2EDF8] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B5299] flex items-center gap-1.5">
                        <span>Baca Selengkapnya</span>
                        <ArrowRight size={14} />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscussInChat({
                            type: 'article',
                            title: art.title,
                            category: art.category,
                            excerpt: art.excerpt,
                          });
                        }}
                        disabled={discussingLoading}
                        className="bg-[#EBF3FC] hover:bg-[#1B5299] text-[#1B5299] hover:text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-[#D1E3F5] hover:border-[#1B5299] disabled:opacity-60"
                        title="Bahas langsung artikel ini dengan AI Konselor"
                      >
                        <MessageSquare size={13} />
                        <span>Bahas di Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIDEO EDUKASI INTERAKTIF */}
        {activeTab === 'videos' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => handleTabClick(null)}
                className="text-xs sm:text-sm font-bold text-[#1B5299] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                Kembali ke Fitur Lainnya
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#0C2340]">
                🎬 Video Edukasi Sosial
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(extrasData.videos || []).map((vid) => (
                <div
                  key={vid.id}
                  className="bg-white border-2 border-[#D1E3F5] rounded-3xl overflow-hidden shadow-soft hover:shadow-float transition flex flex-col justify-between"
                >
                  <div>
                    {/* Video Header Thumbnail Banner */}
                    <div
                      onClick={() => setSelectedVideo(vid)}
                      className="relative h-44 sm:h-48 bg-gradient-to-tr from-[#0C2340] via-[#1B5299] to-[#2B5E94] flex flex-col items-center justify-center text-white cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-xs group-hover:bg-white/30 border border-white/40 flex items-center justify-center transform group-hover:scale-110 transition shadow-lg">
                        <Play size={24} className="text-white fill-white ml-1" />
                      </div>
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        <span>{vid.duration}</span>
                      </div>
                      <div className="absolute bottom-3 left-4 text-xs font-semibold text-white/90">
                        {vid.category}
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="bg-[#EBF3FC] text-[#1B5299] text-xs font-bold px-3 py-1 rounded-full border border-[#D1E3F5]">
                          {vid.category}
                        </span>
                        <span className="text-xs text-[#64748B] flex items-center gap-1">
                          <Tv size={13} />
                          <span>Video Bimbingan</span>
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[#0C2340] leading-snug">
                        {vid.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#3E5771] leading-relaxed line-clamp-2">
                        {vid.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(vid)}
                      className="w-full sm:flex-1 bg-[#F0F5FA] hover:bg-[#E5EFF9] text-[#0C2340] font-bold text-xs sm:text-sm py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-[#D1E3F5]"
                    >
                      <Play size={14} className="fill-[#1B5299] text-[#1B5299]" />
                      <span>Tonton Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDiscussInChat({
                          type: 'video',
                          title: vid.title,
                          category: vid.category,
                          takeaways: vid.keyTakeaways,
                        })
                      }
                      disabled={discussingLoading}
                      className="w-full sm:w-auto bg-[#1B5299] hover:bg-[#133E75] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-soft disabled:opacity-60"
                      title="Bahas topik video ini di Chat AI"
                    >
                      <MessageSquare size={14} />
                      <span>Bahas di Chat</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Video Modal Player */}
            {selectedVideo && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-[#D1E3F5]">
                  <div className="p-4 sm:p-5 border-b border-[#E2EDF8] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#EBF3FC] text-[#1B5299] text-xs font-bold px-3 py-1 rounded-full border border-[#D1E3F5]">
                        {selectedVideo.category}
                      </span>
                      <span className="text-xs text-[#64748B] flex items-center gap-1">
                        <Clock size={12} />
                        {selectedVideo.duration}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#64748B] hover:text-[#0C2340] transition cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="relative w-full pb-[56.25%] bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`}
                      title={selectedVideo.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-extrabold text-lg sm:text-xl text-[#0C2340]">
                        {selectedVideo.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#3E5771] mt-1.5 leading-relaxed">
                        {selectedVideo.description}
                      </p>
                    </div>

                    <div className="bg-[#F8FBFE] border border-[#D1E3F5] rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#0C2340]">
                        <Sparkles size={16} className="text-[#1B5299]" />
                        <span>Poin Penting Video Bimbingan:</span>
                      </div>
                      <ul className="space-y-2">
                        {(selectedVideo.keyTakeaways || []).map((pt, pIdx) => (
                          <li
                            key={pIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0C2340]"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#1B5299] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                              ✓
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDiscussInChat({
                            type: 'video',
                            title: selectedVideo.title,
                            category: selectedVideo.category,
                            takeaways: selectedVideo.keyTakeaways,
                          })
                        }
                        disabled={discussingLoading}
                        className="w-full sm:w-auto bg-[#1B5299] hover:bg-[#133E75] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-2xl shadow-soft transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        <MessageSquare size={15} />
                        <span>{discussingLoading ? 'Membuka Chat...' : 'Bahas Topik Video Ini di Chat AI →'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(null)}
                        className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-[#64748B] hover:text-[#0C2340] cursor-pointer text-center py-2"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HUBUNGI GURU BK */}
        {activeTab === 'counselor' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => handleTabClick(null)}
                className="text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                Kembali ke Fitur Lainnya
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                🎧 Hubungi Guru BK
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 space-y-3">
                {bkSuccess && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-3.5 text-xs sm:text-sm flex items-center gap-2 font-semibold">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600 shrink-0"
                    />
                    <span>
                      Permintaan konseling kamu telah terkirim ke Guru BK!
                    </span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmitBkRequest}
                  className="bg-white border border-[#C5DDF6] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs"
                >
                  <div className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                    Jadwalkan Konseling Bersama Guru BK
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A6382] mb-1">
                      Topik Permasalahan
                    </label>
                    <select
                      value={bkForm.topicTitle}
                      onChange={(e) =>
                        setBkForm({ ...bkForm, topicTitle: e.target.value })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    >
                      <option>Hubungan Pertemanan yang Tidak Sehat</option>
                      <option>Komunikasi Efektif</option>
                      <option>Kepercayaan Diri</option>
                      <option>Mencegah Bullying</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A6382] mb-1">
                      Waktu yang Diinginkan
                    </label>
                    <select
                      value={bkForm.preferredSchedule}
                      onChange={(e) =>
                        setBkForm({
                          ...bkForm,
                          preferredSchedule: e.target.value,
                        })
                      }
                      className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                    >
                      <option>Istirahat Pertama (09.45 - 10.15)</option>
                      <option>Istirahat Kedua (12.00 - 12.45)</option>
                      <option>Sepulang Sekolah (14.30 - 15.30)</option>
                      <option>Konseling Online via Ruang BK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A6382] mb-1">
                      Pesan untuk Guru BK
                    </label>
                    <textarea
                      rows={3}
                      value={bkForm.message}
                      onChange={(e) =>
                        setBkForm({ ...bkForm, message: e.target.value })
                      }
                      placeholder="Ceritakan singkat hal yang ingin kamu konsultasikan..."
                      className="w-full bg-[#F4F9FF] border border-[#C5DDF6] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#163A5F]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs sm:text-sm py-3 rounded-full transition shadow-2xs cursor-pointer"
                  >
                    Kirim Permintaan Konseling
                  </button>
                </form>
              </div>

              <div className="md:col-span-5 space-y-3">
                <div className="text-xs sm:text-sm font-extrabold text-[#184B78]">
                  Riwayat Pengajuan Konseling ({counselorRequests.length})
                </div>
                {counselorRequests.length === 0 ? (
                  <div className="bg-white/80 border border-[#C5DDF6] rounded-2xl p-6 text-center text-xs sm:text-sm text-[#4A6382]">
                    Belum ada pengajuan jadwal konseling tatap muka.
                  </div>
                ) : (
                  counselorRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white border border-[#C5DDF6] rounded-2xl p-4 text-xs sm:text-sm space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#163A5F] truncate">
                          {req.topic_title}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border shrink-0 ${
                            req.status?.toLowerCase().includes('disetujui') || req.status === 'scheduled'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : req.status?.toLowerCase().includes('selesai') || req.status === 'completed'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : req.status?.toLowerCase().includes('tolak') || req.status?.toLowerCase().includes('ulang') || req.status === 'rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[#243B55]">{req.message}</p>
                      <div className="text-xs text-[#4A6382]">
                        Jadwal Yang Diajukan: <span className="font-semibold text-[#184B78]">{req.preferred_schedule}</span>
                      </div>
                      {req.counselor_reply ? (
                        <div className="mt-2 p-3 rounded-xl bg-[#EBF4FC] border border-[#BBD8F6] text-xs text-[#163A5F] space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-[#184B78]">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Tanggapan & Jadwal Resmi Guru BK:</span>
                          </div>
                          <p className="whitespace-pre-line text-[#243B55] pl-4">{req.counselor_reply}</p>
                        </div>
                      ) : (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-amber-600" />
                          <span>Pengajuan telah masuk ke Guru BK dan sedang menunggu konfirmasi/jadwal tatap muka manual.</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* RIWAYAT CHAT */}
        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => handleTabClick(null)}
                className="text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                Kembali ke Fitur Lainnya
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                🕒 Riwayat Chat
              </span>
            </div>

            {userSessions.length === 0 ? (
              <div className="flex-1 bg-white/80 border border-[#C5DDF6] rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <MessageSquare size={40} className="text-[#7B96B2] mb-3" />
                <p className="text-base font-bold text-[#163A5F]">
                  Belum ada riwayat percakapan.
                </p>
                <Link
                  to="/topics"
                  className="mt-4 bg-[#1E5FA8] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full cursor-pointer inline-block"
                >
                  Mulai Konseling →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userSessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => navigate(`/chat/${sess.id}`)}
                    className="bg-white hover:bg-[#EBF4FC] border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 cursor-pointer transition shadow-2xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-[#163A5F] truncate">
                          {sess.topic_title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                            sess.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {sess.status === 'completed' ? 'Selesai' : 'Aktif'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#4A6382] truncate">
                        {sess.last_message || 'Sesi konseling dimulai'}
                      </p>
                      <div className="text-xs text-[#7B96B2]">
                        {sess.message_count} pesan tersimpan
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteSession(sess.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Hapus Riwayat"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full-Width Bottom Input Bar */}
      <div className="w-full px-4 sm:px-10 lg:px-16 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-md border-t border-[#E2EDF8] shadow-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (chatInput.trim()) {
              if (userSessions.length > 0) {
                navigate(`/chat/${userSessions[0].id}`);
              } else {
                navigate('/topics');
              }
            }
          }}
          className="max-w-7xl mx-auto flex items-center gap-2.5 sm:gap-3"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ketik pertanyaan atau kembali ke konseling..."
            className="flex-1 bg-[#F5F8FC] border border-[#D1E3F5] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-sm text-[#0C2340] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B5299] focus:bg-white transition shadow-2xs"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#1B5299] hover:bg-[#133E75] disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow-soft transition cursor-pointer"
            title="Kirim ke Chat"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
