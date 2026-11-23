import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SociaHeartLogo, StudentAvatar } from '../components/Illustrations';
import { TOPIC_CARDS } from '../constants/topics';
import { Menu, ArrowLeft, ArrowRight, Sparkles, Shield, HeartHandshake, MessageCircle, Sparkle } from 'lucide-react';

const TOPIC_DETAILS = {
  friendship: {
    badge: 'Hubungan Sehat',
    themeBg: 'hover:bg-gradient-to-b hover:from-white hover:to-[#F0F7FF]',
    accentColor: '#1B5299',
    tags: ['Merasa dijauhi', 'Toxic circle', 'Salah paham sahabat'],
  },
  communication: {
    badge: 'Bicara Asertif',
    themeBg: 'hover:bg-gradient-to-b hover:from-white hover:to-[#F2F6FC]',
    accentColor: '#2B5E94',
    tags: ['Sulit berkata tidak', 'Takut bicara di depan', 'Menghindari konflik'],
  },
  confidence: {
    badge: 'Rangkul Potensi Diri',
    themeBg: 'hover:bg-gradient-to-b hover:from-white hover:to-[#FFFBF2]',
    accentColor: '#B45309',
    tags: ['Sering minder', 'Membandingkan diri', 'Cemas dinilai orang'],
  },
  bullying: {
    badge: 'Ruang Aman Terlindungi',
    themeBg: 'hover:bg-gradient-to-b hover:from-white hover:to-[#FEF5F5]',
    accentColor: '#B91C1C',
    tags: ['Ejekan di kelas', 'Pengucilan teman', 'Ancaman / Cyberbullying'],
  },
};

export default function TopicsPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    setCurrentSession,
    fetchUserSessions,
    syncUserSession,
  } = useApp();
  const [startingTopic, setStartingTopic] = useState(null);

  useEffect(() => {
    document.title = 'Pilih Ruang Konseling | SociaCare AI';
  }, []);

  async function handleStartTopic(topicId) {
    let user = currentUser;
    if (!user) {
      try {
        const saved = localStorage.getItem('sociacare_user');
        if (saved) user = JSON.parse(saved);
      } catch {}
    }

    if (!user?.id) {
      navigate('/');
      return;
    }

    setStartingTopic(topicId);
    try {
      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/users/${user.id}/sessions`, {
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
        await fetchUserSessions(user.id);
        navigate(`/chat/${data.session.id}`);
        return;
      }

      // Self-healing jika sesi gagal: re-sync otomatis
      const reSyncedUser = await syncUserSession(
        user.name || 'Teman',
        user.avatar_style || 'student-female'
      );
      if (reSyncedUser?.id) {
        const retryRes = await fetch(`/api/users/${reSyncedUser.id}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-token': localStorage.getItem('sociacare_device_token') || '',
          },
          body: JSON.stringify({
            topicId,
            deviceToken: localStorage.getItem('sociacare_device_token') || '',
          }),
        });
        const retryData = await retryRes.json();
        if (retryData.session) {
          setCurrentSession(retryData.session);
          await fetchUserSessions(reSyncedUser.id);
          navigate(`/chat/${retryData.session.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setStartingTopic(null);
    }
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#F5F8FC] flex flex-col justify-between text-[#0C2340]">
      {/* Editorial Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/90 backdrop-blur-md border-b border-[#E2EDF8] sticky top-0 z-30 shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-xl text-[#3E5771] hover:text-[#0C2340] hover:bg-[#EBF3FC] transition cursor-pointer"
              title="Kembali ke Beranda"
            >
              <ArrowLeft size={20} />
            </Link>
            <Link to="/" className="flex items-center gap-3 cursor-pointer">
              <SociaHeartLogo size={36} />
              <span className="font-extrabold text-[#0C2340] text-lg sm:text-xl tracking-tight">
                SociaCare AI
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 bg-[#F0F5FA] border border-[#D1E3F5] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0C2340]">
                <StudentAvatar
                  style={currentUser.avatar_style || 'student-female'}
                  size={24}
                />
                <span className="truncate max-w-[120px]">{currentUser.name}</span>
              </div>
            )}
            <Link
              to="/extras"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0C2340] bg-white hover:bg-[#EBF3FC] border border-[#D1E3F5] transition shadow-soft cursor-pointer"
              title="Fitur & Panduan Lainnya"
            >
              <span className="hidden sm:inline">Fitur Lainnya</span>
              <Menu size={18} className="text-[#1B5299]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Focus Selection Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 md:py-12 flex flex-col justify-center">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 bg-white border border-[#D1E3F5] px-3.5 py-1 rounded-full shadow-soft text-xs font-semibold text-[#1B5299]">
            <span>Langkah Pertama Konseling</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0C2340] tracking-tight">
            Apa yang paling ingin kamu bicarakan hari ini?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#3E5771] leading-relaxed">
            Pilih area permasalahan di bawah ini. Tenang, kamu bisa menceritakan apa saja dengan bahasamu sendiri tanpa terburu-buru.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {TOPIC_CARDS.map((topic) => {
            const Illustration = topic.Illustration;
            const isStarting = startingTopic === topic.id;
            const details = TOPIC_DETAILS[topic.id] || {
              badge: 'Bimbingan Siswa',
              themeBg: 'hover:bg-[#F0F5FA]',
              accentColor: '#1B5299',
              tags: [],
            };

            return (
              <button
                key={topic.id}
                type="button"
                disabled={Boolean(startingTopic)}
                onClick={() => handleStartTopic(topic.id)}
                className={`group bg-white border-2 border-[#D1E3F5] hover:border-[#1B5299] disabled:opacity-70 rounded-3xl p-5 sm:p-7 flex flex-col justify-between text-left transition duration-200 shadow-soft hover:shadow-float min-h-[240px] sm:min-h-[290px] cursor-pointer relative overflow-hidden ${details.themeBg}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#F0F5FA] text-[#3E5771] border border-[#E2EDF8]">
                      {details.badge}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-[#F0F5FA] group-hover:bg-[#1B5299] group-hover:text-white text-[#1B5299] flex items-center justify-center transition shrink-0">
                      <ArrowRight size={15} />
                    </span>
                  </div>

                  <div className="my-5 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                    {isStarting ? (
                      <div className="w-16 h-16 flex items-center justify-center">
                        <Sparkles size={32} className="animate-spin text-[#1B5299]" />
                      </div>
                    ) : (
                      <Illustration />
                    )}
                  </div>

                  <h3 className="font-extrabold text-base sm:text-lg text-[#0C2340] leading-snug group-hover:text-[#1B5299] transition">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-[#3E5771] mt-2 leading-relaxed">
                    {topic.desc}
                  </p>
                </div>

                {/* Sub-tag hints to connect emotionally */}
                <div className="mt-5 pt-3.5 border-t border-[#E2EDF8] flex flex-wrap gap-1.5">
                  {details.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-semibold text-[#64748B] bg-[#F5F8FC] px-2 py-0.5 rounded-md"
                    >
                      • {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quiet Reassurance Strip */}
        <div className="mt-10 max-w-xl mx-auto text-center bg-white/70 border border-[#E2EDF8] rounded-2xl py-3 px-5 text-xs text-[#64748B] flex items-center justify-center gap-2 shadow-2xs">
          <Shield size={15} className="text-[#1B5299] shrink-0" />
          <span>Sesi ini sepenuhnya privat dan aman. Percakapan tersimpan secara terenkripsi di perangkatmu.</span>
        </div>
      </main>

      <footer className="w-full py-4 text-center text-xs text-[#64748B] border-t border-[#E2EDF8] bg-white">
        SociaCare AI • Didukung panduan konseling ramah anak & etika perlindungan siswa.
      </footer>
    </div>
  );
}