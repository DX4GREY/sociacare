import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Trash2, ArrowRight, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function LogoutModal() {
  const {
    currentUser,
    logoutStep,
    isWiping,
    proceedToSecondWarning,
    cancelLogout,
    confirmFinalLogoutAndWipe,
  } = useApp();

  if (!logoutStep) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
      {/* STEP 1: PERINGATAN PERTAMA */}
      {logoutStep === 1 && (
        <div className="bg-white border-2 border-amber-300 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-float space-y-5 text-[#0C2340] animate-in zoom-in-95">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={26} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Konfirmasi 1 dari 2
                </span>
                <h3 className="font-extrabold text-lg text-[#0C2340] mt-1">
                  Yakin Ingin Keluar?
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelLogout}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm text-[#3E5771] leading-relaxed">
            <p>
              Halo <strong>{currentUser?.name || 'Siswa'}</strong>, sesi konseling SociaCare AI di perangkat ini bersifat{' '}
              <strong className="text-amber-800">sementara dan sangat privat</strong> demi melindungi keamanan rahasiamu.
            </p>
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={14} />
                <span>Penting untuk Diperhatikan:</span>
              </div>
              <p>
                Jika kamu keluar, seluruh riwayat percakapan dan sesi kamu di perangkat ini akan <strong>dihapus secara permanen</strong> agar akun dan ceritamu tidak bisa diakses atau disalahgunakan oleh orang lain.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={cancelLogout}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#0C2340] font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl transition cursor-pointer order-2 sm:order-1"
            >
              Batal, Tetap di Sini
            </button>
            <button
              type="button"
              onClick={proceedToSecondWarning}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-soft flex items-center justify-center gap-1.5 transition cursor-pointer order-1 sm:order-2"
            >
              <span>Lanjutkan Keluar</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PERINGATAN KEDUA (FINAL DESTRUCTION WARNING) */}
      {logoutStep === 2 && (
        <div className="bg-white border-2 border-red-600 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-float space-y-5 text-red-950 animate-in zoom-in-95">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-md">
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full border border-red-300">
                  ⚠️ Peringatan Terakhir (2 dari 2)
                </span>
                <h3 className="font-extrabold text-lg text-red-900 mt-1">
                  Data Akan Dihapus Permanen
                </h3>
              </div>
            </div>
            {!isWiping && (
              <button
                type="button"
                onClick={cancelLogout}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-red-950 space-y-2">
              <div className="font-extrabold text-red-900 uppercase tracking-wide text-xs">
                🚨 PERINGATAN PENGHAPUSAN DATA:
              </div>
              <p className="font-semibold text-xs sm:text-sm">
                Seluruh pesan chat, topik permasalahan, dan riwayat kamu pada sesi ini akan <strong>LANGSUNG DIHAPUS TOTAL DARI SERVER DAN PERANGKAT INI</strong>.
              </p>
              <p className="text-[11px] text-red-800">
                Data yang sudah dihapus <strong>TIDAK AKAN PERNAH BISA DIPULIHKAN KEMBALI</strong>. Ini menjamin kerahasiaanmu 100% aman dan tidak ada orang lain yang bisa membuka akunmu.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={isWiping}
              onClick={cancelLogout}
              className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-[#0C2340] font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl transition cursor-pointer order-2 sm:order-1"
            >
              Batalkan
            </button>
            <button
              type="button"
              disabled={isWiping}
              onClick={confirmFinalLogoutAndWipe}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-soft flex items-center justify-center gap-2 transition cursor-pointer order-1 sm:order-2"
            >
              {isWiping ? (
                <>
                  <Sparkles size={16} className="animate-spin" />
                  <span>Membersihkan Data...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Ya, Hapus Data & Keluar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
