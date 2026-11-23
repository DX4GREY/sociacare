import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SociaHeartLogo } from '../components/Illustrations';
import { Menu, Heart, ArrowRight, BookOpen, Home, CheckCircle2, Sparkles } from 'lucide-react';

export default function ClosingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Terima Kasih Sudah Bercerita | SociaCare AI';
  }, []);

  return (
    <div className="w-full min-h-[100dvh] bg-[#F5F8FC] flex flex-col justify-between text-[#0C2340]">
      {/* Top Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/90 backdrop-blur-md border-b border-[#E2EDF8]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <SociaHeartLogo size={36} />
            <span className="font-extrabold text-[#0C2340] text-lg sm:text-xl tracking-tight">
              SociaCare AI
            </span>
          </Link>
          <Link
            to="/extras"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0C2340] bg-white hover:bg-[#EBF3FC] border border-[#D1E3F5] transition shadow-soft cursor-pointer"
            title="Fitur Lainnya"
          >
            <span className="hidden sm:inline">Fitur Lainnya</span>
            <Menu size={18} className="text-[#1B5299]" />
          </Link>
        </div>
      </header>

      {/* Main Closing Reflection Sanctuary */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-12 md:py-16 flex flex-col items-center justify-center text-center">
        {/* Soft Heart Emblem */}
        <div className="w-16 h-16 rounded-full bg-[#EBF3FC] border border-[#D1E3F5] flex items-center justify-center text-[#1B5299] shadow-soft mb-6">
          <Heart size={28} className="fill-[#1B5299]" />
        </div>

        <div className="space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Sesi Selesai dengan Baik</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0C2340] tracking-tight leading-tight">
            Kamu hebat sudah berani <br />
            <span className="text-[#1B5299]">bercerita hari ini.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#3E5771] max-w-lg mx-auto leading-relaxed pt-1">
            Membuka isi hati dan mengakui rasa cemas bukanlah hal yang mudah. Mengambil langkah pertama untuk bercerita membuktikan bahwa kamu peduli pada kesehatan emosionalmu sendiri.
          </p>
        </div>

        {/* Affirmation Note Card */}
        <div className="w-full bg-white border-2 border-[#D1E3F5] rounded-3xl p-6 sm:p-8 shadow-float text-left mb-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#1B5299]">
            <Sparkles size={16} />
            <span>Pesan Reflektif untuk Dibawa Pulang</span>
          </div>
          <p className="text-xs sm:text-sm text-[#0C2340] leading-relaxed">
            Perubahan dalam hubungan sosial membutuhkan waktu dan kesabaran. Lakukan satu langkah kecil yang telah kamu diskusikan hari ini, dan ingat bahwa kamu berhak merasa aman, dihargai, dan didengarkan di lingkungan sekolahmu.
          </p>
          <div className="pt-3 border-t border-[#E2EDF8] flex items-center justify-between text-xs text-[#64748B]">
            <span>Pintu SociaCare selalu terbuka untukmu.</span>
            <span className="hand-title text-base text-[#1B5299] font-bold">Tetap semangat ya! ♡</span>
          </div>
        </div>

        {/* Action Steps */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/topics')}
            className="bg-[#1B5299] hover:bg-[#133E75] text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-2xl shadow-soft transition flex items-center gap-2 cursor-pointer"
          >
            <span>Mulai Konseling Baru</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/extras')}
            className="bg-white hover:bg-[#F8FBFE] text-[#0C2340] border border-[#D1E3F5] text-xs sm:text-sm font-bold px-6 py-3.5 rounded-2xl shadow-soft transition flex items-center gap-2 cursor-pointer"
          >
            <BookOpen size={16} className="text-[#1B5299]" />
            <span>Baca Tips & Artikel Edukasi</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-white hover:bg-[#F8FBFE] text-[#3E5771] hover:text-[#0C2340] border border-[#E2EDF8] text-xs sm:text-sm font-bold px-5 py-3.5 rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Home size={15} />
            <span>Halaman Depan</span>
          </button>
        </div>
      </main>

      {/* Reassuring Footer */}
      <footer className="w-full py-5 text-center text-xs text-[#64748B] border-t border-[#E2EDF8] bg-white">
        SociaCare AI • Sahabat setia mendengarkan cerita dan perjalanan sosialmu di sekolah.
      </footer>
    </div>
  );
}