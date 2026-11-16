import React from 'react';
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

  async function handleStartCounselingClick(e) {
    if (e) e.preventDefault();
    if (currentUser && !isEditingProfile) {
      navigate('/topics');
      return;
    }
    if (!nameInput.trim()) {
      setFormError('Silakan isi Nama kamu terlebih dahulu.');
      return;
    }
    const user = await syncUserSession(nameInput.trim(), avatarInput);
    if (user) {
      navigate('/topics');
    }
  }

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#F2F8FF] via-[#E6F2FC] to-[#CFE5FA] flex flex-col justify-between relative overflow-x-hidden">
      {/* Full-Width Top Navbar */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/85 backdrop-blur-md border-b border-[#D5E6F7] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <SociaHeartLogo size={38} />
            <div>
              <span className="font-extrabold text-[#163A5F] text-lg sm:text-xl tracking-tight">
                SociaCare AI
              </span>
              <span className="hidden md:inline-block ml-3 text-xs font-semibold text-[#1E5FA8] bg-[#E6F1FC] px-3 py-1 rounded-full border border-[#B8D4F2]">
                Sahabat Konseling Hubungan Sosial Siswa
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/extras"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[#2B547E] hover:bg-[#E3EFFC] transition cursor-pointer"
              title="Fitur Lainnya"
            >
              <span className="hidden sm:inline text-xs sm:text-sm font-bold text-[#184B78]">
                Fitur Lainnya
              </span>
              <Menu size={24} />
            </Link>
          </div>
        </div>
      </header>

      {/* Full-Screen Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 md:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16 items-center relative z-10">
        {/* Left Column: Greeting & Intro */}
        <div className="md:col-span-7 flex flex-col justify-center">
          <div className="flex items-start gap-2">
            <h1 className="hand-title text-6xl sm:text-7xl lg:text-8xl font-bold text-[#15385C] leading-none">
              Hai!
            </h1>
            <svg
              width="36"
              height="36"
              viewBox="0 0 28 28"
              fill="none"
              className="mt-1"
            >
              <path
                d="M6 14L14 6M11 20L21 12M14 24L22 20"
                stroke="#3B82F6"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="hand-title text-4xl sm:text-5xl lg:text-6xl font-bold text-[#15385C] leading-tight mt-2">
            Ada yang ingin
            <br />
            kamu ceritakan?
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-[#2C4A6B] mt-5 max-w-xl leading-relaxed">
            Aku di sini untuk mendengarkan, memahami, dan menemani kamu
            menghadapi permasalahan dalam hubungan sosial.
          </p>

          {/* Desktop Topic Pills */}
          <div className="hidden md:flex flex-wrap gap-2.5 mt-8">
            {TOPIC_CARDS.map((t) => (
              <span
                key={t.id}
                className="bg-white/80 border border-[#B8D4F2] text-[#184B78] text-xs lg:text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-2xs"
              >
                <HeartHandshake size={15} className="text-[#1E5FA8]" />
                {t.shortTitle}
              </span>
            ))}
          </div>
        </div>

        {/* Right Column: Student Identity Form & CTA */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <div className="bg-white/90 backdrop-blur-md border border-[#B8D4F2] rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
            {currentUser && !isEditingProfile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <StudentAvatar
                      style={currentUser.avatar_style || 'student-female'}
                      size={52}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#4A6382]">
                        Profil Pengguna Aktif
                      </div>
                      <div className="font-extrabold text-xl text-[#163A5F] truncate">
                        {currentUser.name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-[#1E5FA8] hover:underline shrink-0 cursor-pointer"
                  >
                    Ganti Profil
                  </button>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/topics')}
                    className="w-full bg-[#1E5FA8] hover:bg-[#15467E] text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-full shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Mulai Konseling Baru</span>
                    <ArrowRight size={18} />
                  </button>

                  {userSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${userSessions[0].id}`)}
                      className="w-full bg-[#E8F2FC] hover:bg-[#D5E8FA] text-[#184B78] text-xs sm:text-sm font-bold py-3 px-5 rounded-full transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare size={16} />
                      <span>Lanjutkan Sesi Terakhir ({userSessions[0].topic_title})</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/extras')}
                      className="flex-1 bg-white hover:bg-[#F2F7FC] text-[#244B75] border border-[#C5DDF6] text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      Fitur Lainnya
                    </button>
                    <button
                      type="button"
                      onClick={handleLogoutProfile}
                      className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Keluar"
                    >
                      <LogOut size={14} />
                      <span className="hidden sm:inline">Keluar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartCounselingClick} className="space-y-4">
                <div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-[#163A5F]">
                    {isEditingProfile ? 'Perbarui Profil Siswa' : 'Mulai Sesi Konseling'}
                  </h3>
                  <p className="text-xs text-[#4A6382] mt-1 leading-relaxed">
                    Masukkan namamu agar SociaCare AI dapat menyapamu secara personal.
                  </p>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5">
                    Nama / Nama Panggilan
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="Contoh: Budi, Sarah, Rizky..."
                    className="w-full bg-[#F5F9FD] border-2 border-[#C5DDF6] focus:border-[#1E5FA8] rounded-2xl px-4 py-3 text-sm font-semibold text-[#163A5F] placeholder-[#8EA9C7] focus:outline-none transition"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3A5F] mb-1.5">
                    Pilih Avatar Karakter
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAvatarInput('student-female')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition cursor-pointer ${
                        avatarInput === 'student-female'
                          ? 'border-[#1E5FA8] bg-[#E8F2FC] shadow-2xs'
                          : 'border-[#D5E6F7] bg-white/70 hover:bg-white'
                      }`}
                    >
                      <StudentAvatar style="student-female" size={38} />
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-[#163A5F]">
                          Siswi
                        </div>
                        <div className="text-[10px] text-[#4A6382]">
                          Avatar Perempuan
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAvatarInput('student-male')}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition cursor-pointer ${
                        avatarInput === 'student-male'
                          ? 'border-[#1E5FA8] bg-[#E8F2FC] shadow-2xs'
                          : 'border-[#D5E6F7] bg-white/70 hover:bg-white'
                      }`}
                    >
                      <StudentAvatar style="student-male" size={38} />
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-[#163A5F]">
                          Siswa
                        </div>
                        <div className="text-[10px] text-[#4A6382]">
                          Avatar Laki-laki
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loadingAuth}
                    className="flex-1 bg-[#1E5FA8] hover:bg-[#15467E] disabled:opacity-60 text-white text-sm sm:text-base font-bold py-3.5 px-6 rounded-full shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loadingAuth ? (
                      <>
                        <Sparkles size={16} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span>Mulai Konseling</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  {isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-3.5 rounded-full border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Decorative Bottom Wave SVG */}
      <svg
        viewBox="0 0 1440 90"
        fill="none"
        className="w-full h-14 sm:h-20 shrink-0 pointer-events-none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 40C280 5 560 75 920 30C1180 5 1320 40 1440 25V90H0V40Z"
          fill="#B7D8F8"
          fillOpacity="0.65"
        />
        <path
          d="M0 60C380 25 720 85 1100 45C1280 28 1370 45 1440 55V90H0V60Z"
          fill="#95C2F2"
          fillOpacity="0.55"
        />
      </svg>
    </div>
  );
}
