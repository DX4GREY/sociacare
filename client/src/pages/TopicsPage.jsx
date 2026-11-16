import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SociaHeartLogo, StudentAvatar } from '../components/Illustrations';
import { TOPIC_CARDS } from '../constants/topics';
import { Menu, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export default function TopicsPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentSession, fetchUserSessions } = useApp();
  const [startingTopic, setStartingTopic] = useState(null);

  async function handleStartTopic(topicId) {
    if (!currentUser) {
      navigate('/');
      return;
    }
    setStartingTopic(topicId);
    try {
      const devToken = localStorage.getItem('sociacare_device_token') || '';
      const res = await fetch(`/api/users/${currentUser.id}/sessions`, {
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
        await fetchUserSessions(currentUser.id);
        navigate(`/chat/${data.session.id}`);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setStartingTopic(null);
    }
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#F4F9FF] flex flex-col justify-between">
      {/* Full-Width Header */}
      <header className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/95 border-b border-[#D5E6F7] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <SociaHeartLogo size={36} />
            <span className="font-extrabold text-[#163A5F] text-lg sm:text-xl">
              SociaCare AI
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2.5 bg-[#E8F2FC] border border-[#C5DDF6] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold text-[#163A5F]">
                <StudentAvatar
                  style={currentUser.avatar_style || 'student-female'}
                  size={24}
                />
                <span>{currentUser.name}</span>
              </div>
            )}
            <Link
              to="/extras"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#2B547E] hover:bg-[#E3EFFC] transition cursor-pointer"
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

      {/* Full-Screen Topic Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-10 lg:px-16 py-8 md:py-12 flex flex-col justify-center">
        <h2 className="text-center font-extrabold text-xl sm:text-2xl md:text-3xl text-[#163A5F] mb-8 md:mb-10">
          Pilih permasalahan yang sedang kamu hadapi:
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {TOPIC_CARDS.map((topic) => {
            const Illustration = topic.Illustration;
            const isStarting = startingTopic === topic.id;
            return (
              <button
                key={topic.id}
                type="button"
                disabled={Boolean(startingTopic)}
                onClick={() => handleStartTopic(topic.id)}
                className="group bg-[#E8F2FC] hover:bg-[#DCEBFA] border-2 border-[#C5DDF6] hover:border-[#1E5FA8] disabled:opacity-70 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center text-center transition shadow-xs hover:shadow-md min-h-[190px] sm:min-h-[260px] cursor-pointer"
              >
                <div className="mb-4 sm:mb-5 transform group-hover:scale-110 transition">
                  {isStarting ? (
                    <div className="w-16 h-16 flex items-center justify-center">
                      <Sparkles size={32} className="animate-spin text-[#1E5FA8]" />
                    </div>
                  ) : (
                    <Illustration />
                  )}
                </div>
                <span className="font-extrabold text-sm sm:text-base md:text-lg text-[#163A5F] leading-snug">
                  {topic.title}
                </span>
                <span className="hidden sm:block text-xs sm:text-sm text-[#4A6382] mt-2.5 leading-relaxed">
                  {topic.desc}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Full-Width Footer Bar */}
      <footer className="w-full px-5 sm:px-10 lg:px-16 py-4 bg-white/80 border-t border-[#D8E8F8]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm text-[#4A6382]">
          <Link
            to="/"
            className="flex items-center gap-1.5 hover:text-[#163A5F] font-bold cursor-pointer"
          >
            <ArrowLeft size={16} />
            Halaman Awal
          </Link>
          <Link
            to="/extras"
            className="text-[#1E5FA8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Fitur Lainnya</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
