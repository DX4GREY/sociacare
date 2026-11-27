import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Megaphone,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bell,
  X,
  Pin,
} from 'lucide-react';

const SEVERITY_STYLES = {
  info: {
    headerBg: 'bg-gradient-to-r from-[#1E5FA8] to-[#2B7DE9]',
    badgeBg: 'bg-white/20 text-white',
    badgeLabel: 'Pengumuman',
    btnBg: 'bg-[#1E5FA8] hover:bg-[#15467E] text-white',
    Icon: Info,
  },
  important: {
    headerBg: 'bg-gradient-to-r from-red-600 to-rose-600',
    badgeBg: 'bg-white/20 text-white',
    badgeLabel: 'Penting',
    btnBg: 'bg-red-600 hover:bg-red-700 text-white',
    Icon: AlertTriangle,
  },
  warning: {
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    badgeBg: 'bg-white/20 text-white',
    badgeLabel: 'Peringatan',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    Icon: Bell,
  },
  success: {
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    badgeBg: 'bg-white/20 text-white',
    badgeLabel: 'Informasi Baik',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    Icon: CheckCircle2,
  },
};

export default function AnnouncementModal({ mode = 'student', teacherToken = '' }) {
  const location = useLocation();
  const appCtx = useApp();
  const currentUser = mode === 'student' ? appCtx?.currentUser : null;

  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const recordedViewIdsRef = useRef(new Set());

  const isStaffRoute =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/guru') ||
    location.pathname.startsWith('/bk');

  const isEnabled =
    mode === 'teacher'
      ? Boolean(teacherToken)
      : Boolean(currentUser?.id) && !isStaffRoute;

  const fetchActiveAnnouncements = useCallback(async () => {
    if (!isEnabled) {
      setAnnouncements([]);
      return;
    }

    try {
      let url = '';
      const headers = {};

      if (mode === 'teacher') {
        url = '/api/announcements/active?role=teacher';
        headers['x-admin-token'] = teacherToken;
      } else {
        const devToken = localStorage.getItem('sociacare_device_token') || '';
        if (!devToken || !currentUser?.id) return;
        url = `/api/announcements/active?role=student&userId=${encodeURIComponent(currentUser.id)}`;
        headers['x-device-token'] = devToken;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
    } catch {
      // Abaikan gangguan jaringan sementara saat polling pengumuman
    }
  }, [isEnabled, mode, teacherToken, currentUser?.id]);

  useEffect(() => {
    fetchActiveAnnouncements();
    if (!isEnabled) return;
    const interval = setInterval(fetchActiveAnnouncements, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveAnnouncements, isEnabled]);

  // Reset dismissed set when user/teacher identity changes
  useEffect(() => {
    setDismissedIds(new Set());
    recordedViewIdsRef.current = new Set();
  }, [mode, currentUser?.id, teacherToken]);

  const visibleQueue = announcements.filter((a) => !dismissedIds.has(a.id));
  const activeAnn = visibleQueue[0] || null;

  // Catat status "sudah dilihat" segera saat dialog tampil di layar user
  useEffect(() => {
    if (!activeAnn || !isEnabled) return;
    if (recordedViewIdsRef.current.has(activeAnn.id)) return;
    recordedViewIdsRef.current.add(activeAnn.id);

    const headers = { 'Content-Type': 'application/json' };
    const body = { role: mode };

    if (mode === 'teacher') {
      headers['x-admin-token'] = teacherToken;
    } else {
      const devToken = localStorage.getItem('sociacare_device_token') || '';
      headers['x-device-token'] = devToken;
      body.userId = currentUser?.id;
      body.deviceToken = devToken;
    }

    fetch(`/api/announcements/${activeAnn.id}/view`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).catch(() => {});
  }, [activeAnn, isEnabled, mode, teacherToken, currentUser?.id]);

  if (!isEnabled || !activeAnn) return null;

  const style = SEVERITY_STYLES[activeAnn.severity] || SEVERITY_STYLES.info;
  const HeaderIcon = style.Icon || Megaphone;
  const isPersistent = activeAnn.display_mode === 'persistent';

  function handleDismiss() {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(activeAnn.id);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-dialog-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${style.headerBg} px-6 py-5 text-white relative`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <HeaderIcon size={24} className="text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${style.badgeBg}`}>
                    {style.badgeLabel} dari Admin
                  </span>
                  {isPersistent && (
                    <span className="text-[10px] font-bold bg-black/20 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Pin size={10} />
                      <span>Pesan Tersemat</span>
                    </span>
                  )}
                  {visibleQueue.length > 1 && (
                    <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">
                      1 dari {visibleQueue.length}
                    </span>
                  )}
                </div>
                <h2
                  id="announcement-dialog-title"
                  className="font-extrabold text-base sm:text-lg leading-snug"
                >
                  {activeAnn.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 transition cursor-pointer shrink-0"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="text-sm sm:text-[15px] text-[#1E3A5F] leading-relaxed whitespace-pre-line max-h-[55vh] overflow-y-auto pr-1">
            {activeAnn.message}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-medium">
              {isPersistent
                ? 'Pesan ini akan terus ditampilkan hingga dihapus oleh Admin.'
                : 'Pesan ini hanya ditampilkan sekali untukmu.'}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className={`${style.btnBg} font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer shrink-0`}
            >
              {visibleQueue.length > 1
                ? 'Lanjut Pesan Berikutnya'
                : isPersistent
                ? 'Mengerti (Tutup Sementara)'
                : 'Mengerti & Tutup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
