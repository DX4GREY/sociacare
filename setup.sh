#!/usr/bin/env bash
# ==============================================================================
# SociaCare AI — VPS Setup, Hardening, & Update Script
# Menangani Instalasi Awal, Pembaruan Sistem, dan Remediasi Audit Keamanan
# (C1-C5, H1-H5, M1-M4, L1-L3)
# ==============================================================================

set -euo pipefail

# 0. Verifikasi Akses Root
if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "❌ Error: Script ini harus dijalankan sebagai root / menggunakan sudo."
  echo "Gunakan: sudo bash setup.sh"
  exit 1
fi

echo "======================================================"
echo "🛡️  MEMULAI SETUP & PENGUATAN KEAMANAN (SOCIACARE AI)"
echo "======================================================"

# 1. Swapfile (2GB) untuk pencegahan Out-Of-Memory
if ! swapon --show | grep -q '/swapfile'; then
  echo "⚙️  Mengonfigurasi 2GB Swap Memory..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  echo "✅ Swap memory aktif."
fi

# 2. Pembaruan Paket Sistem & Patch Keamanan OS (Finding L2)
echo "📦 Memperbarui paket sistem dan security patch Ubuntu..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx ufw fail2ban openssl

# 3. Instalasi Node.js 22 LTS & PM2
if ! command -v node &>/dev/null || [[ "$(node -v)" != v22* ]]; then
  echo "📦 Memasang Node.js 22.x LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

# 4. Pembuatan User Terisolasi Unprivileged 'sociacare' (Finding C4)
if ! id -u sociacare &>/dev/null; then
  echo "👤 Membuat pengguna sistem 'sociacare' tanpa hak root..."
  useradd --system --create-home --shell /usr/sbin/nologin sociacare
fi

# 5. Konfigurasi Firewall UFW (Finding C4)
echo "🧱 Mengonfigurasi UFW Firewall (Hanya Port 22, 80, 443)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✅ UFW aktif: Port 3001 tertutup dari akses luar langsung."

# 6. Konfigurasi Fail2ban untuk SSH (Finding H1)
echo "🔒 Mengaktifkan Fail2ban untuk proteksi brute force SSH..."
cat << 'EOF' > /etc/fail2ban/jail.d/sshd.local
[sshd]
enabled = true
port = 22
filter = sshd
backend = systemd
maxretry = 5
findtime = 600
bantime = 3600
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# 7. Pengerasan SSH (Finding H1)
if [ -f /root/.ssh/authorized_keys ] && [ -s /root/.ssh/authorized_keys ]; then
  echo "🔑 Menyiapkan akun administrator non-root 'deploy'..."
  if ! id -u deploy &>/dev/null; then
    useradd -m -s /bin/bash -G sudo deploy
    echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/99-deploy
    chmod 440 /etc/sudoers.d/99-deploy
  fi
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys

  echo "🛡️  Menerapkan konfigurasi drop-in SSH hardening..."
  cat << 'EOF' > /etc/ssh/sshd_config.d/99-hardening.conf
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
PermitRootLogin prohibit-password
PasswordAuthentication no
EOF
  if sshd -t; then
    systemctl reload ssh || systemctl restart ssh
    echo "✅ SSH Hardening berhasil diterapkan."
  else
    echo "⚠️  Validasi sshd gagal, membatalkan perubahan konfigurasi SSH."
    rm -f /etc/ssh/sshd_config.d/99-hardening.conf
  fi
fi

# 8. Setup Direktori Repository & Kode Aplikasi
mkdir -p /var/www
cd /var/www
if [ -d 'sociacare/.git' ]; then
  echo "🔄 Memperbarui repository sociacare..."
  cd sociacare
  git reset --hard HEAD
  git pull origin main || git pull || true
else
  echo "📥 Mengunduh kode repository sociacare..."
  git clone https://github.com/DX4GREY/sociacare.git
  cd sociacare
fi

# 9. Hardening .env & Kunci Rahasia Acak (Finding C1, H5)
if [ ! -f server/.env ]; then
  echo "⚙️  Membuat file server/.env dari server/.env.example..."
  cp server/.env.example server/.env
fi

# Pastikan SESSION_SECRET terisi secara acak (64 hex characters)
if ! grep -q "^SESSION_SECRET=.\+" server/.env; then
  SEC_TOKEN=$(openssl rand -hex 32)
  if grep -q "^SESSION_SECRET=" server/.env; then
    sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${SEC_TOKEN}/" server/.env
  else
    echo "SESSION_SECRET=${SEC_TOKEN}" >> server/.env
  fi
  echo "✅ SESSION_SECRET baru telah digenerate di server/.env."
fi

# Pastikan ADMIN_PASSWORD bukan default yang lemah
CURRENT_ADMIN_PWD=$(grep "^ADMIN_PASSWORD=" server/.env | cut -d'=' -f2- || true)
if [ -z "$CURRENT_ADMIN_PWD" ] || [ "$CURRENT_ADMIN_PWD" = "admin123" ] || [ "$CURRENT_ADMIN_PWD" = "12345678" ] || [ "$CURRENT_ADMIN_PWD" = "ganti_dengan_password_admin_yang_kuat" ]; then
  NEW_ADMIN_PWD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9!@#%^&*' | head -c 24)
  sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${NEW_ADMIN_PWD}/" server/.env
  echo "🔑 ADMIN_PASSWORD telah diperbarui ke password kuat baru: ${NEW_ADMIN_PWD}"
fi

# Pastikan HOST=127.0.0.1 dan NODE_ENV=production
if grep -q "^HOST=" server/.env; then
  sed -i "s/^HOST=.*/HOST=127.0.0.1/" server/.env
else
  echo "HOST=127.0.0.1" >> server/.env
fi

if grep -q "^NODE_ENV=" server/.env; then
  sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" server/.env
else
  echo "NODE_ENV=production" >> server/.env
fi

# 10. Batasi Hak Akses File Rahasia & Database (Finding H2, H5)
chmod 600 server/.env
[ -f server/sociacare.sql.db ] && chmod 600 server/sociacare.sql.db || true

# 11. Build Client & Server Dependencies
echo "🏗️  Menginstal dependensi dan membangun aplikasi (React Vite build)..."
npm run build

# Berikan kepemilikan folder ke user sociacare
chown -R sociacare:sociacare /var/www/sociacare
chmod 750 /var/www/sociacare

# 12. Konfigurasi Nginx Hardening (Finding H3, L1, L3)
echo "🌐 Mengonfigurasi Nginx Reverse Proxy & Security Headers..."

# Matikan server_tokens di nginx.conf (Finding L1)
if grep -q "server_tokens" /etc/nginx/nginx.conf; then
  sed -i 's/server_tokens.*/server_tokens off;/' /etc/nginx/nginx.conf
else
  sed -i '/http {/a \    server_tokens off;' /etc/nginx/nginx.conf
fi

# Tambahkan rate limiting zones di drop-in /etc/nginx/conf.d/
cat << 'EOF' > /etc/nginx/conf.d/security_limits.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
EOF

SSL_CERT="/etc/letsencrypt/live/sociacare.my.id/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/sociacare.my.id/privkey.pem"

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  echo "🔒 Sertifikat SSL Let's Encrypt terdeteksi. Menerapkan konfigurasi HTTPS penuh dengan HTTP/2 & Security Headers..."
  cat << 'EOF' > /etc/nginx/sites-available/sociacare
# Drop permintaan HTTP dengan Host tidak dikenal
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}

# Redirect HTTP ke HTTPS untuk domain resmi
server {
    listen 80;
    listen [::]:80;
    server_name sociacare.my.id www.sociacare.my.id;
    return 301 https://$host$request_uri;
}

# Server Utama HTTPS (TLS v1.2 / v1.3 + HTTP/2)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name sociacare.my.id www.sociacare.my.id;

    ssl_certificate /etc/letsencrypt/live/sociacare.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sociacare.my.id/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    # Security Headers (Finding H3)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; frame-ancestors 'self';" always;

    # Tolak akses file sensitif dan hidden files
    location ~ /\.(?!well-known) { deny all; return 404; }
    location ~* \.(sql|db|bak|old|env)$ { deny all; return 404; }

    # Proteksi Brute-Force pada Endpoint Login
    location ~ ^/api/(admin|teacher)/login {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proteksi Rate-Limit pada API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
else
  echo "ℹ️  Sertifikat SSL belum ditemukan di /etc/letsencrypt. Mengonfigurasi HTTP hardening standar..."
  cat << 'EOF' > /etc/nginx/sites-available/sociacare
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10M;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Tolak akses file sensitif dan hidden files
    location ~ /\.(?!well-known) { deny all; return 404; }
    location ~* \.(sql|db|bak|old|env)$ { deny all; return 404; }

    # Rate limiting login
    location ~ ^/api/(admin|teacher)/login {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
fi

ln -sf /etc/nginx/sites-available/sociacare /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx || systemctl restart nginx

# 13. Menjalankan Node.js Backend di bawah User Unprivileged 'sociacare' (Finding C4)
echo "🚀 Mengonfigurasi PM2 Service di bawah user 'sociacare'..."

# Hentikan instansi PM2 lama dari root jika ada
pm2 delete sociacare 2>/dev/null || true
pm2 save --force 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
rm -f /etc/systemd/system/pm2-root.service

# Jalankan service sebagai user sociacare
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 pm2 delete sociacare 2>/dev/null || true
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 pm2 start /var/www/sociacare/server/index.js --name 'sociacare'
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 pm2 save

# Setup PM2 startup unit untuk user sociacare
env PATH="$PATH:/usr/bin" /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u sociacare --hp /home/sociacare || true
systemctl daemon-reload
systemctl enable pm2-sociacare 2>/dev/null || true

echo ""
echo "======================================================"
echo "✅ SETUP & PENGUATAN KEAMANAN SELESAI DENGAN SUKSES!"
echo "======================================================"
echo "1. Express Backend terikat lokal ke: 127.0.0.1:3001"
echo "2. PM2 berjalan di bawah pengguna tanpa-root: sociacare"
echo "3. Firewall UFW aktif: Hanya Port 22, 80, 443 yang diizinkan"
echo "4. Proteksi Brute-Force: Fail2ban & Rate-Limit Nginx aktif"
echo "5. File rahasia (.env & sqlite db) dikunci: chmod 600"
echo "6. Session Token kriptografis & role-based RBAC aktif"
echo "Web aktif di: https://sociacare.my.id (atau http://$(curl -s -4 ifconfig.me || echo 'IP_VPS'))"
echo "======================================================"
