import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SociaHeartLogo, StudentAvatar } from '../components/Illustrations';
import { TOPIC_CARDS } from '../constants/topics';
import {
  Menu,
  HeartHandshake,
  ArrowRight,
  LogOut,
  Sparkles,
  MessageSquare,
  GraduationCap,
  ShieldCheck,
  Lock,
  Clock3,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    currentUser,
    isEditingProfile,
    setIsEditingProfile,
    nameInput,
    setNameInput,
    avatarInput,
    setAvatarInput,
    formError,
    setFormError,
    loadingAuth,
    syncUserSession,
    handleLogoutProfile,
    userSessions,
  } = useApp();

  useEffect(() => {
    document.title = 'SociaCare AI — Ruang Konseling & Sahabat Bimbingan Siswa';
  }, []);

  async function handleStartCounselingClick(e) {
    if (e) e.preventDefault();
    if (currentUser && !isEditingProfile) {
      navigate('/topics');
      return;
    }
    if (!nameInput.trim()) {
      setFormError('Silakan isi nama panggilanmu terlebih dahulu.');
      return;
    }
    const user = await syncUserSession(nameInput.trim(), avatarInput);
    if (user) {
      navigate('/topics');
    }
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#F5F8FC] flex flex-col justify-between text-[#0C2340]">
      {/* Editorial Top Navbar */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/90 backdrop-blur-md border-b border-[#E2EDF8] sticky top-0 z-30 shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <SociaHeartLogo size={40} className="transition-transform group-hover:scale-105" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#0C2340] text-lg sm:text-xl tracking-tight">
                  SociaCare AI
                </span>
              </div>
              <span className="hidden md:block text-xs text-[#3E5771] font-medium">
                Sahabat Konseling Sosial & Bimbingan Emosional Siswa
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/guru"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1B5299] hover:bg-[#EBF3FC] transition border border-transparent hover:border-[#D1E3F5]"
            >
              <GraduationCap size={16} />
              <span>Portal Guru BK</span>
            </Link>

            <Link
              to="/extras"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0C2340] bg-white hover:bg-[#EBF3FC] border border-[#D1E3F5] transition shadow-soft cursor-pointer"
              title="Fitur & Panduan Lainnya"
            >
              <span>Fitur Lainnya</span>
              <Menu size={18} className="text-[#1B5299]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Sanctuary Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        {/* Left Column: Reassuring Welcome & Focus Areas */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-2 self-start bg-white border border-[#D1E3F5] px-3.5 py-1.5 rounded-full shadow-soft">
            <span className="hand-title text-base sm:text-lg text-[#1B5299] font-bold">
              Ruang pribadi tanpa penghakiman ♡
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-[#0C2340] tracking-tight leading-[1.15]">
              Ada hal yang terasa <br className="hidden sm:inline" />
              <span className="text-[#1B5299]">berat di sekolah</span> hari ini?
            </h1>
            <p className="text-base sm:text-lg text-[#3E5771] max-w-xl leading-relaxed pt-1">
              Punya masalah dengan teman atau hubungan di sekolah? Ceritakan di SociaCare AI. Kami hadir sebagai teman cerita yang membantu kamu memahami perasaan dan menemukan informasi serta saran sederhana.
            </p>
          </div>

          {/* Core Guarantees: Tactile Trust Markers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/80 border border-[#E2EDF8] p-3.5 rounded-2xl flex items-start gap-3 shadow-soft">
              <div className="p-2 rounded-xl bg-[#EBF3FC] text-[#1B5299] shrink-0">
                <Lock size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0C2340]">100% Rahasia</div>
                <div className="text-[11px] text-[#64748B] leading-snug">Ceritamu hanya milikmu dan aman.</div>
              </div>
            </div>

            <div className="bg-white/80 border border-[#E2EDF8] p-3.5 rounded-2xl flex items-start gap-3 shadow-soft">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0">
                <Clock3 size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0C2340]">Siap 24 Jam</div>
                <div className="text-[11px] text-[#64748B] leading-snug">Kapan pun kamu ingin bercerita.</div>
              </div>
            </div>

            <div className="bg-white/80 border border-[#E2EDF8] p-3.5 rounded-2xl flex items-start gap-3 shadow-soft">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0C2340]">Didukung Guru BK</div>
                <div className="text-[11px] text-[#64748B] leading-snug">Jadwalkan temu langsung bila butuh.</div>
              </div>
            </div>
          </div>

          {/* Topic Pills: Tangible conversation anchors */}
          <div className="pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
              Topik yang sering didiskusikan:
            </div>
            <div className="flex flex-wrap gap-2">
              {TOPIC_CARDS.map((t) => (
                <span
                  key={t.id}
                  className="bg-white hover:bg-[#EBF3FC] border border-[#D1E3F5] text-[#1B5299] text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition shadow-soft"
                >
                  <HeartHandshake size={14} className="text-[#1B5299]" />
                  <span>{t.shortTitle}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Student Desk Entry Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white border-2 border-[#D1E3F5] rounded-3xl p-6 sm:p-8 shadow-float relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#EBF3FC] to-transparent rounded-bl-full pointer-events-none" />

            {currentUser && !isEditingProfile ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#E2EDF8]">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <StudentAvatar
                      style={currentUser.avatar_style || 'student-female'}
                      size={54}
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                        Teman Bercerita
                      </span>
                      <div className="font-extrabold text-xl text-[#0C2340] truncate">
                        {currentUser.name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-[#1B5299] hover:underline shrink-0 cursor-pointer"
                  >
                    Ganti Profil
                  </button>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/topics')}
                    className="w-full bg-[#1B5299] hover:bg-[#133E75] text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-2xl shadow-soft transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Bicara dengan SociaCare</span>
                    <ArrowRight size={18} />
                  </button>

                  {userSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${userSessions[0].id}`)}
                      className="w-full bg-[#F0F5FA] hover:bg-[#E5EFF9] text-[#0C2340] text-xs sm:text-sm font-bold py-3 px-5 rounded-2xl border border-[#D1E3F5] transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare size={16} className="text-[#1B5299]" />
                      <span className="truncate">Lanjutkan Sesi: {userSessions[0].topic_title}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/extras')}
                      className="flex-1 bg-white hover:bg-[#F8FBFE] text-[#0C2340] border border-[#D1E3F5] text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      Fitur & Tips Sosial
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutProfile}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100 cursor-pointer"
                      title="Keluar"
                    >
                      <LogOut size={14} />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartCounselingClick} className="space-y-5">
                <div>
                  <h3 className="font-extrabold text-xl text-[#0C2340]">
                    {isEditingProfile ? 'Perbarui Profil Siswa' : 'Mulai Konseling Santai'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#3E5771] mt-1 leading-relaxed">
                    Ketik nama panggilanmu agar percakapan terasa hangat dan personal.
                  </p>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl animate-shake">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0C2340] mb-1.5">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="Misal: Dinda, Farhan, Zahra..."
                    className="w-full bg-[#F5F8FC] border-2 border-[#D1E3F5] focus:border-[#1B5299] focus:bg-white rounded-2xl px-4 py-3 text-base sm:text-sm font-semibold text-[#0C2340] placeholder-[#94A3B8] focus:outline-none transition shadow-2xs"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0C2340] mb-1.5">
                    Pilih Karakter Teman
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAvatarInput('student-female')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition cursor-pointer text-left ${
                        avatarInput === 'student-female'
                          ? 'border-[#1B5299] bg-[#EBF3FC] shadow-soft'
                          : 'border-[#E2EDF8] bg-white hover:bg-[#F5F8FC]'
                      }`}
                    >
                      <StudentAvatar style="student-female" size={40} />
                      <div>
                        <div className="text-xs font-extrabold text-[#0C2340]">
                          Siswi
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Karakter Remaja
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarInput('student-male')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition cursor-pointer text-left ${
                        avatarInput === 'student-male'
                          ? 'border-[#1B5299] bg-[#EBF3FC] shadow-soft'
                          : 'border-[#E2EDF8] bg-white hover:bg-[#F5F8FC]'
                      }`}
                    >
                      <StudentAvatar style="student-male" size={40} />
                      <div>
                        <div className="text-xs font-extrabold text-[#0C2340]">
                          Siswa
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Karakter Remaja
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loadingAuth}
                    className="flex-1 bg-[#1B5299] hover:bg-[#133E75] disabled:opacity-60 text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-2xl shadow-soft transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loadingAuth ? (
                      <>
                        <Sparkles size={16} className="animate-spin" />
                        <span>Menyiapkan Ruangan...</span>
                      </>
                    ) : (
                      <>
                        <span>Mulai Konseling Sekarang</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  {isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-3.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-[#E2EDF8] flex items-center justify-center">
              <Link
                to="/guru"
                className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-[#1B5299] hover:text-[#133E75] transition py-2 px-3 rounded-xl bg-[#F0F5FA] hover:bg-[#E5EFF9] border border-[#D1E3F5]"
              >
                <GraduationCap size={16} />
                <span>Portal Khusus Guru BK & Konselor Sekolah</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Structural Architectural Safety & Support Footer */}
      <footer className="w-full bg-white border-t border-[#E2EDF8] py-6 px-5 sm:px-10 lg:px-16 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span className="font-bold text-[#0C2340]">SociaCare AI</span>
            <span>•</span>
            <span>Didesain untuk mendampingi kesehatan relasional & emosional remaja sekolah.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold">
            <span className="text-[#0C2340]">Layanan Darurat Bebas Pulsa:</span>
            <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-200">
              SAPA Perlindungan: 129
            </span>
            <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200">
              Hotline Kemenkes: 119 ext 8
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}