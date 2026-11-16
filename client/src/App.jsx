import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import EmergencyModal from './components/EmergencyModal';
import HomePage from './pages/HomePage';
import TopicsPage from './pages/TopicsPage';
import ChatPage from './pages/ChatPage';
import ExtrasPage from './pages/ExtrasPage';
import ClosingPage from './pages/ClosingPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPanel from './components/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <EmergencyModal />
        <Routes>
          {/* Halaman Utama / Identitas Siswa */}
          <Route path="/" element={<HomePage />} />

          {/* Pemilihan Topik Konseling */}
          <Route path="/topics" element={<TopicsPage />} />

          {/* Ruang Chat Konseling Interaktif */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:sessionId" element={<ChatPage />} />

          {/* Fitur Lainnya (Tips Sosial, Artikel, Hubungi Guru BK, Riwayat Chat) */}
          <Route path="/extras" element={<ExtrasPage />} />
          <Route path="/extras/:tab" element={<ExtrasPage />} />
          <Route path="/extras/articles/:articleId" element={<ExtrasPage />} />

          {/* Halaman Penutup & Apresiasi Sesi */}
          <Route path="/closing" element={<ClosingPage />} />

          {/* Portal Administrator & Guru BK */}
          <Route path="/admin/*" element={<AdminPanel />} />

          {/* 404 Not Found Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
