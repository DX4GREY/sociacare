import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShieldAlert, PhoneCall } from 'lucide-react';

export default function EmergencyModal() {
  const navigate = useNavigate();
  const { emergencyModalWarning, setEmergencyModalWarning, setBkForm } = useApp();

  if (!emergencyModalWarning) return null;

  return (
    <div className="fixed inset-0 bg-red-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-red-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-float space-y-5 text-red-950 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse shadow-md">
            <ShieldAlert size={28} />
          </div>
          <div>
            <span className="inline-block bg-red-100 text-red-800 border border-red-300 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              🚨 Mode Gawat Darurat Aktif
            </span>
            <h3 className="font-extrabold text-lg sm:text-xl text-red-900 mt-1">
              Peringatan Keselamatan Berbasis AI
            </h3>
          </div>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-xs sm:text-sm leading-relaxed text-red-950 font-semibold">
          {emergencyModalWarning}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-1.5">
          <div className="font-extrabold text-amber-900">Layanan Bantuan Darurat 24 Jam Bebas Pulsa:</div>
          <div>
            • Hotline Kesehatan Jiwa Kemenkes: <strong>119 ext 8</strong>
          </div>
          <div>
            • Layanan SAPA (Kekerasan & Perlindungan Anak/Remaja): <strong>129</strong>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setEmergencyModalWarning(null);
              setBkForm((prev) => ({
                ...prev,
                urgency: 'darurat',
                message:
                  prev.message ||
                  'DARURAT: Saya sedang dalam kondisi sangat berat dan butuh bantuan konselor segera.',
              }));
              navigate('/extras/counselor');
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm py-3.5 px-5 rounded-2xl shadow-soft flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <PhoneCall size={16} />
            <span>Hubungi Konselor / Guru BK Sekarang</span>
          </button>
          <button
            type="button"
            onClick={() => setEmergencyModalWarning(null)}
            className="bg-red-100 hover:bg-red-200 text-red-900 font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl transition cursor-pointer"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
