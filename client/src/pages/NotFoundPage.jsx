import React from 'react';
import { Link } from 'react-router-dom';
import { SociaHeartLogo } from '../components/Illustrations';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-[#F4F9FF] flex flex-col justify-between items-center text-center p-6">
      <header className="w-full max-w-7xl flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <SociaHeartLogo size={36} />
          <span className="font-extrabold text-[#163A5F] text-lg sm:text-xl">
            SociaCare AI
          </span>
        </Link>
      </header>

      <main className="my-auto max-w-md space-y-5">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#E8F2FC] border-2 border-[#C5DDF6] flex items-center justify-center">
          <SociaHeartLogo size={48} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#163A5F]">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-[#2B547E]">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-[#4A6382] leading-relaxed">
          Sepertinya tautan yang kamu tuju salah atau telah dipindahkan.
          Jangan khawatir, kamu bisa kembali ke halaman awal kapan saja!
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="bg-[#1E5FA8] hover:bg-[#15467E] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Home size={16} />
            <span>Ke Halaman Awal</span>
          </Link>
          <Link
            to="/topics"
            className="bg-white hover:bg-[#F2F7FC] text-[#1E5FA8] border border-[#C5DDF6] text-xs sm:text-sm font-bold px-6 py-3 rounded-full transition flex items-center gap-2 cursor-pointer"
          >
            <span>Pilih Topik Konseling</span>
          </Link>
        </div>
      </main>

      <footer className="text-xs text-[#7B96B2] py-4">
        SociaCare AI — Sahabat Konseling Hubungan Sosial Siswa
      </footer>
    </div>
  );
}
