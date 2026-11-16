import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SociaHeartLogo } from '../components/Illustrations';
import { Menu } from 'lucide-react';

export default function ClosingPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-[100dvh] bg-gradient-to-b from-[#F6FAFF] via-[#E8F3FC] to-[#CFE5FA] flex flex-col justify-between relative text-center">
      {/* Top Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/85 backdrop-blur-md border-b border-[#D5E6F7]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <SociaHeartLogo size={36} />
            <span className="font-extrabold text-[#163A5F] text-lg sm:text-xl">
              SociaCare AI
            </span>
          </Link>
          <Link
            to="/extras"
            className="p-2 rounded-xl text-[#2B547E] hover:bg-[#E3EFFC] transition cursor-pointer"
            title="Fitur Lainnya"
          >
            <Menu size={24} />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 sm:p-16 flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="relative inline-block">
          <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            className="absolute -left-9 top-1"
          >
            <path
              d="M18 6L10 14M20 14L12 20"
              stroke="#60A5FA"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
          <h2 className="hand-title text-5xl sm:text-6xl md:text-7xl font-bold text-[#15385C] leading-tight">
            Kamu hebat
            <br />
            sudah berani bercerita hari ini! ♡
          </h2>
        </div>

        <div className="mt-10 space-y-1.5">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#15385C] tracking-tight">
            SociaCare AI
          </div>
          <div className="hand-title text-2xl sm:text-3xl text-[#244B75]">
            Selalu ada untukmu ♡
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate('/topics')}
            className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-bold px-7 py-3.5 rounded-full shadow transition cursor-pointer"
          >
            Mulai Konseling Baru
          </button>
          <button
            type="button"
            onClick={() => navigate('/extras')}
            className="bg-white/90 hover:bg-white text-[#184B78] border border-[#B4D2F2] text-xs sm:text-sm font-bold px-6 py-3.5 rounded-full shadow-2xs transition cursor-pointer"
          >
            Fitur Lainnya
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-white/90 hover:bg-white text-[#184B78] border border-[#B4D2F2] text-xs sm:text-sm font-bold px-6 py-3.5 rounded-full shadow-2xs transition cursor-pointer"
          >
            Halaman Awal
          </button>
        </div>
      </main>

      {/* Decorative Bottom Wave */}
      <svg
        viewBox="0 0 1440 90"
        fill="none"
        className="w-full h-16 sm:h-24 shrink-0 pointer-events-none"
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
