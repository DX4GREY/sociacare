-- ============================================================================
-- SociaCare AI - SQL Database Schema (PostgreSQL & SQLite Compatible)
-- Penyimpanan Data Per User, Penggunaan Token AI, & Pengaturan Format AI
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(120) NOT NULL,
    class_name VARCHAR(60) DEFAULT '',
    avatar_style VARCHAR(40) DEFAULT 'student-female',
    device_token VARCHAR(255) DEFAULT '',
    is_emergency INTEGER DEFAULT 0,
    emergency_level VARCHAR(30) DEFAULT 'normal',
    emergency_reason TEXT DEFAULT '',
    emergency_warning_ai TEXT DEFAULT '',
    emergency_updated_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_id VARCHAR(60) NOT NULL,
    topic_title VARCHAR(150) NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    stage INTEGER DEFAULT 3,
    is_emergency INTEGER DEFAULT 0,
    emergency_level VARCHAR(30) DEFAULT 'normal',
    emergency_reason TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    sender VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    structured_json TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counselor_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_title VARCHAR(150) NOT NULL,
    preferred_schedule VARCHAR(100) NOT NULL,
    urgency VARCHAR(30) DEFAULT 'normal',
    message TEXT NOT NULL,
    status VARCHAR(40) DEFAULT 'Menunggu Konfirmasi Guru BK',
    counselor_reply TEXT DEFAULT 'Permintaan konseling tatap muka kamu telah diterima oleh ruang BK. Guru BK akan menghubungi kamu sesuai jadwal.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_saved_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tip_id VARCHAR(60) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER DEFAULT NULL,
    user_id INTEGER DEFAULT NULL,
    model_name VARCHAR(80) NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    thought_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER DEFAULT NULL,
    severity VARCHAR(30) DEFAULT 'critical',
    trigger_message TEXT NOT NULL,
    ai_warning_message TEXT NOT NULL,
    ai_assessment TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_tips (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    points_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_articles (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    read_time VARCHAR(50) DEFAULT '3 menit',
    excerpt TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_videos (
    id VARCHAR(80) PRIMARY KEY,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    duration VARCHAR(50) DEFAULT '5:00',
    description TEXT NOT NULL,
    youtube_id VARCHAR(100) NOT NULL,
    embed_url TEXT NOT NULL,
    key_takeaways_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
