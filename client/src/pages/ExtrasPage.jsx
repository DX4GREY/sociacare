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
    userSessions,
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

  // Map route params to active tab
  const activeTab = tab === 'gurubk' ? 'counselor' : tab || null;

  useEffect(() => {
    if (articleId && extrasData.articles.length > 0) {
      const art = extrasData.articles.find((a) => String(a.id) === String(articleId));
      if (art) setSelectedArticle(art);
    } else if (!articleId) {
      setSelectedArticle(null);
    }
  }, [articleId, extrasData.articles]);

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
    <div className="w-full min-h-[100dvh] bg-[#F4F9FF] flex flex-col justify-between">
      {/* Full-Width Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/95 border-b border-[#D5E6F7] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <SociaHeartLogo size={36} />
            <div className="leading-tight">
              <div className="font-extrabold text-[#163A5F] text-base sm:text-lg">
                SociaCare AI
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Online</span>
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
                className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-full transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#1E5FA8] text-white shadow-2xs'
                    : 'bg-[#E8F2FC] hover:bg-[#DCEBFA] text-[#163A5F]'
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
              className="p-2 rounded-xl text-[#2B547E] hover:bg-[#E3EFFC] transition cursor-pointer"
              title="Kembali"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 flex flex-col">
        {!activeTab && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="my-auto">
              <h2 className="text-center font-extrabold text-xl sm:text-2xl md:text-3xl text-[#163A5F] mb-8">
                Fitur Lainnya
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => handleTabClick('tips')}
                  className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[170px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-110 transition">
                    <ExtraTipsIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                    Tips Sosial
                  </span>
                  <span className="hidden sm:block text-xs text-[#4A6382] mt-1.5">
                    Panduan praktis pergaulan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('articles')}
                  className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[170px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-110 transition">
                    <ExtraArticleIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                    Artikel Informasi
                  </span>
                  <span className="hidden sm:block text-xs text-[#4A6382] mt-1.5">
                    Edukasi psikologi remaja
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('videos')}
                  className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[170px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-110 transition">
                    <ExtraVideoIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                    Video Edukasi
                  </span>
                  <span className="hidden sm:block text-xs text-[#4A6382] mt-1.5">
                    Video & animasi bimbingan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('counselor')}
                  className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[170px] sm:min-h-[220px] cursor-pointer"
                >
                  <div className="mb-3.5 transform group-hover:scale-110 transition">
                    <ExtraGuruBkIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                    Hubungi Guru BK
                  </span>
                  <span className="hidden sm:block text-xs text-[#4A6382] mt-1.5">
                    Jadwalkan sesi tatap muka
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabClick('history')}
                  className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[170px] sm:min-h-[220px] cursor-pointer col-span-2 sm:col-span-1"
                >
                  <div className="mb-3.5 transform group-hover:scale-110 transition">
                    <ExtraHistoryIcon size={52} />
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-[#163A5F]">
                    Riwayat Chat
                  </span>
                  <span className="hidden sm:block text-xs text-[#1E5FA8] font-semibold mt-1.5">
                    {userSessions.length} sesi tersimpan
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#D8E8F8] flex items-center justify-between text-xs sm:text-sm">
              <Link
                to={userSessions.length > 0 ? `/chat/${userSessions[0].id}` : '/topics'}
                className="text-[#1E5FA8] font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={16} />
                {userSessions.length > 0 ? 'Kembali ke Percakapan' : 'Pilih Topik'}
              </Link>
              <Link
                to="/closing"
                className="bg-[#E3EFFC] hover:bg-[#CFE4FA] text-[#184B78] font-bold px-4 py-2 rounded-full transition cursor-pointer"
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
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => {
                  if (selectedArticle) handleBackFromArticle();
                  else handleTabClick(null);
                }}
                className="text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                {selectedArticle
                  ? 'Kembali ke Daftar Artikel'
                  : 'Kembali ke Fitur Lainnya'}
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                📖 Artikel Informasi
              </span>
            </div>

            {selectedArticle ? (
              <div className="bg-white border border-[#C5DDF6] rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto space-y-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="bg-[#E6F1FC] text-[#1E5FA8] font-bold px-3.5 py-1 rounded-full">
                    {selectedArticle.category}
                  </span>
                  <span className="text-[#4A6382]">
                    {selectedArticle.readTime}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg sm:text-2xl text-[#163A5F]">
                  {selectedArticle.title}
                </h3>
                <div className="space-y-4 text-sm sm:text-base text-[#243B55] leading-relaxed">
                  {selectedArticle.content.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {extrasData.articles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => handleArticleSelect(art)}
                    className="bg-white hover:bg-[#EBF4FC] border border-[#C5DDF6] rounded-2xl p-5 cursor-pointer transition shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-[#1E5FA8] bg-[#E6F1FC] px-3 py-0.5 rounded-full">
                          {art.category}
                        </span>
                        <span className="text-[#4A6382]">{art.readTime}</span>
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-[#163A5F]">
                        {art.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4A6382] mt-2 line-clamp-2">
                        {art.excerpt}
                      </p>
                    </div>
                    <div className="mt-4 text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1">
                      <span>Baca Selengkapnya</span>
                      <ArrowRight size={14} />
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
                className="text-xs sm:text-sm font-bold text-[#1E5FA8] flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <ArrowLeft size={16} />
                Kembali ke Fitur Lainnya
              </button>
              <span className="text-sm sm:text-base font-extrabold text-[#163A5F]">
                🎬 Video Edukasi Sosial
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(extrasData.videos || []).map((vid) => (
                <div
                  key={vid.id}
                  className="bg-white border border-[#C5DDF6] rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Video Header Thumbnail Banner */}
                    <div
                      onClick={() => setSelectedVideo(vid)}
                      className="relative h-44 sm:h-48 bg-gradient-to-tr from-[#163A5F] via-[#1E5FA8] to-[#3B82F6] flex flex-col items-center justify-center text-white cursor-pointer group"
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
                        <span className="bg-[#E6F1FC] text-[#1E5FA8] text-xs font-bold px-3 py-0.5 rounded-full">
                          {vid.category}
                        </span>
                        <span className="text-xs text-[#6B8BA4] flex items-center gap-1">
                          <Tv size={13} />
                          <span>Video Bimbingan</span>
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-[#163A5F] leading-snug">
                        {vid.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4A6382] leading-relaxed line-clamp-2">
                        {vid.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(vid)}
                      className="w-full bg-[#EBF4FD] hover:bg-[#1E5FA8] text-[#1E5FA8] hover:text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-full transition flex items-center justify-center gap-2 cursor-pointer border border-[#C5DDF6]"
                    >
                      <Play size={14} className="fill-current" />
                      <span>Tonton Video & Simak Poin Penting</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Video Modal Player */}
            {selectedVideo && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#C5DDF6]">
                  <div className="p-4 sm:p-5 border-b border-[#E3EFFC] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#E6F1FC] text-[#1E5FA8] text-xs font-bold px-3 py-1 rounded-full">
                        {selectedVideo.category}
                      </span>
                      <span className="text-xs text-[#4A6382] flex items-center gap-1">
                        <Clock size={12} />
                        {selectedVideo.duration}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(null)}
                      className="p-1.5 rounded-full hover:bg-slate-100 text-[#4A6382] hover:text-slate-900 transition cursor-pointer"
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
                      <h3 className="font-extrabold text-lg sm:text-xl text-[#163A5F]">
                        {selectedVideo.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4A6382] mt-1.5 leading-relaxed">
                        {selectedVideo.description}
                      </p>
                    </div>

                    <div className="bg-[#F0F7FF] border border-[#C5DDF6] rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#163A5F]">
                        <Sparkles size={16} className="text-[#1E5FA8]" />
                        <span>Poin Penting Video Bimbingan:</span>
                      </div>
                      <ul className="space-y-2">
                        {(selectedVideo.keyTakeaways || []).map((pt, pIdx) => (
                          <li
                            key={pIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-[#23456D]"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#1E5FA8] text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                              ✓
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVideo(null);
                          if (userSessions.length > 0) {
                            navigate(`/chat/${userSessions[0].id}`);
                          } else {
                            navigate('/topics');
                          }
                        }}
                        className="bg-[#1E5FA8] hover:bg-[#15467E] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full transition cursor-pointer"
                      >
                        Bahas Topik Ini di Chat AI →
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(null)}
                        className="text-xs sm:text-sm font-semibold text-[#4A6382] hover:text-[#163A5F] cursor-pointer"
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
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold shrink-0">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[#243B55]">{req.message}</p>
                      <div className="text-xs text-[#4A6382]">
                        Jadwal: {req.preferred_schedule}
                      </div>
                      {req.counselor_reply && (
                        <div className="mt-1.5 p-2.5 rounded-xl bg-[#EBF4FC] border border-[#C5DDF6] text-xs text-[#163A5F]">
                          <span className="font-bold">Balasan Guru BK: </span>
                          {req.counselor_reply}
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

      {/* Full-Width Bottom Input Bar (only shown if user wants to ask something or quick jump) */}
      <div className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/95 border-t border-[#D5E6F7]">
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
          className="max-w-7xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ketik pertanyaan atau kembali ke konseling..."
            className="flex-1 bg-[#F2F7FD] border border-[#C5DDF6] rounded-full px-5 py-3 text-xs sm:text-sm md:text-base text-[#163A5F] placeholder-[#7B96B2] focus:outline-none focus:border-[#1E5FA8]"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-11 h-11 rounded-full bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-50 text-white flex items-center justify-center shrink-0 shadow transition cursor-pointer"
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
