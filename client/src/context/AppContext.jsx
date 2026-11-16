import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sociacare_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(() => {
    try {
      const saved = localStorage.getItem('sociacare_user');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.name || '';
    } catch {
      return '';
    }
  });
  const [avatarInput, setAvatarInput] = useState(() => {
    try {
      const saved = localStorage.getItem('sociacare_user');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.avatar_style || 'student-female';
    } catch {
      return 'student-female';
    }
  });
  const [formError, setFormError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [currentSession, setCurrentSession] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [emergencyModalWarning, setEmergencyModalWarning] = useState(null);

  const [extrasData, setExtrasData] = useState({
    tips: [],
    articles: [],
    savedTipIds: [],
  });
  const [counselorRequests, setCounselorRequests] = useState([]);
  const [bkForm, setBkForm] = useState({
    topicTitle: 'Hubungan Pertemanan yang Tidak Sehat',
    preferredSchedule: 'Istirahat Pertama (09.45 - 10.15)',
    urgency: 'normal',
    message: '',
  });
  const [bkSuccess, setBkSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sociacare_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) {
          fetchUserSessions(parsed.id);
          fetchUserCounselorRequests(parsed.id);
          fetchExtrasContent(parsed.id);
          return;
        }
      } catch {
        localStorage.removeItem('sociacare_user');
      }
    }
    fetchExtrasContent(0);
  }, []);

  async function syncUserSession(name, avatarStyle) {
    setFormError('');
    setLoadingAuth(true);
    try {
      const res = await fetch('/api/users/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatarStyle }),
      });
      const data = await res.json();
      if (!res.ok || !data.user) {
        setFormError(data.error || 'Nama wajib diisi.');
        return null;
      }

      setCurrentUser(data.user);
      setIsEditingProfile(false);
      localStorage.setItem('sociacare_user', JSON.stringify(data.user));

      await Promise.all([
        fetchUserSessions(data.user.id),
        fetchUserCounselorRequests(data.user.id),
        fetchExtrasContent(data.user.id),
      ]);

      return data.user;
    } catch {
      setFormError('Tidak dapat terhubung ke server. Silakan coba lagi.');
      return null;
    } finally {
      setLoadingAuth(false);
    }
  }

  async function fetchUserSessions(userId) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}/sessions`);
      const data = await res.json();
      if (data.sessions) setUserSessions(data.sessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  async function fetchUserCounselorRequests(userId) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}/counselor-requests`);
      const data = await res.json();
      if (data.requests) setCounselorRequests(data.requests);
    } catch (err) {
      console.error('Failed to load counselor requests:', err);
    }
  }

  async function fetchExtrasContent(userId) {
    try {
      const res = await fetch(`/api/content/extras?userId=${userId || 0}`);
      const data = await res.json();
      if (data.tips) setExtrasData(data);
    } catch (err) {
      console.error('Failed to load extras:', err);
    }
  }

  function handleLogoutProfile() {
    localStorage.removeItem('sociacare_user');
    setCurrentUser(null);
    setCurrentSession(null);
    setUserSessions([]);
    setCounselorRequests([]);
    setNameInput('');
    setIsEditingProfile(false);
  }

  async function deleteSession(sessionId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    try {
      await fetch(
        `/api/sessions/${sessionId}?userId=${encodeURIComponent(currentUser.id)}`,
        { method: 'DELETE' }
      );
      await fetchUserSessions(currentUser.id);
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  async function handleToggleBookmarkTip(tipId) {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/saved-tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipId }),
      });
      const data = await res.json();
      if (data.savedTipIds) {
        setExtrasData((prev) => ({ ...prev, savedTipIds: data.savedTipIds }));
      }
    } catch (err) {
      console.error('Failed to bookmark tip:', err);
    }
  }

  async function handleSubmitBkRequest(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser || !bkForm.message.trim()) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/counselor-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bkForm),
      });
      const data = await res.json();
      if (data.requests) {
        setCounselorRequests(data.requests);
        setBkForm((prev) => ({ ...prev, message: '' }));
        setBkSuccess(true);
        setTimeout(() => setBkSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to submit counselor request:', err);
    }
  }

  const isEmergencyMode = Boolean(
    currentUser?.is_emergency === 1 || currentSession?.is_emergency === 1
  );

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
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
        currentSession,
        setCurrentSession,
        userSessions,
        setUserSessions,
        fetchUserSessions,
        deleteSession,
        counselorRequests,
        fetchUserCounselorRequests,
        extrasData,
        setExtrasData,
        fetchExtrasContent,
        handleToggleBookmarkTip,
        bkForm,
        setBkForm,
        bkSuccess,
        handleSubmitBkRequest,
        emergencyModalWarning,
        setEmergencyModalWarning,
        isEmergencyMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
