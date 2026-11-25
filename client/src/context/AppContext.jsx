import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function getOrCreateDeviceToken() {
  let token = localStorage.getItem('sociacare_device_token');
  if (!token) {
    token =
      'dev_' +
      (window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36));
    localStorage.setItem('sociacare_device_token', token);
  }
  return token;
}

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
    videos: [],
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

  const [logoutStep, setLogoutStep] = useState(null); // null | 1 | 2
  const [isWiping, setIsWiping] = useState(false);

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
    const deviceToken = getOrCreateDeviceToken();
    try {
      const res = await fetch('/api/users/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': deviceToken,
        },
        body: JSON.stringify({ name, avatarStyle, deviceToken }),
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
      const devToken = getOrCreateDeviceToken();
      const res = await fetch(`/api/users/${userId}/sessions`, {
        headers: { 'x-device-token': devToken },
      });
      const data = await res.json();
      if (data.sessions) setUserSessions(data.sessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  async function fetchUserCounselorRequests(userId) {
    if (!userId) return;
    try {
      const devToken = getOrCreateDeviceToken();
      const res = await fetch(`/api/users/${userId}/counselor-requests`, {
        headers: { 'x-device-token': devToken },
      });
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

  function requestLogout() {
    setLogoutStep(1);
  }

  function proceedToSecondWarning() {
    setLogoutStep(2);
  }

  function cancelLogout() {
    setLogoutStep(null);
  }

  async function confirmFinalLogoutAndWipe() {
    setIsWiping(true);
    try {
      if (currentUser?.id) {
        const devToken = getOrCreateDeviceToken();
        await fetch(`/api/users/${currentUser.id}/wipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-token': devToken,
          },
          body: JSON.stringify({ deviceToken: devToken }),
        }).catch((err) => console.error('Wipe error:', err));
      }
    } finally {
      // Clear localStorage session
      localStorage.removeItem('sociacare_user');
      // Generate a new clean device token so subsequent users get a fresh isolated record
      const newToken =
        'dev_' +
        (window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36));
      localStorage.setItem('sociacare_device_token', newToken);

      setCurrentUser(null);
      setCurrentSession(null);
      setUserSessions([]);
      setCounselorRequests([]);
      setNameInput('');
      setIsEditingProfile(false);
      setIsWiping(false);
      setLogoutStep(null);
      window.location.href = '/';
    }
  }

  function handleLogoutProfile() {
    requestLogout();
  }

  async function deleteSession(sessionId, e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    try {
      const devToken = getOrCreateDeviceToken();
      await fetch(
        `/api/sessions/${sessionId}?userId=${encodeURIComponent(currentUser.id)}`,
        {
          method: 'DELETE',
          headers: { 'x-device-token': devToken },
        }
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
      const devToken = getOrCreateDeviceToken();
      const res = await fetch(`/api/users/${currentUser.id}/saved-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': devToken,
        },
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
      const devToken = getOrCreateDeviceToken();
      const res = await fetch(`/api/users/${currentUser.id}/counselor-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': devToken,
        },
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
        requestLogout,
        logoutStep,
        isWiping,
        proceedToSecondWarning,
        cancelLogout,
        confirmFinalLogoutAndWipe,
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
