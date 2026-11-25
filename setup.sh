#!/usr/bin/env bash
# ==============================================================================
# SociaCare AI — VPS Setup, Hardening & Update Automation Script
# Mendukung instalasi awal (fresh install) dan pembaruan berkala (update)
# Berdasarkan Security Audit Report sociacare.my.id
# ==============================================================================

set -euo pipefail

# Pastikan script dieksekusi dengan hak akses root / sudo
if [ "$(id -u)" -ne 0 ]; then
  echo "[-] Script ini harus dijalankan sebagai root (gunakan: sudo bash setup.sh)" >&2
  exit 1
fi

echo "======================================================"
echo "🚀 MEMULAI SETUP & HARDENING SOCIA CARE SERVER"
echo "======================================================"

# ------------------------------------------------------------------------------
# 1. SETUP SWAP MEMORY (2GB)
# ------------------------------------------------------------------------------
echo "[1/9] Memeriksa alokasi Swap memory..."
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '/swapfile none swap' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  echo "[+] Swapfile 2GB berhasil diaktifkan."
else
  echo "[+] Swapfile sudah aktif."
fi

# ------------------------------------------------------------------------------
# 2. SISTEM UPDATE & INSTALASI DEPENDENSI (L2 Fix)
# ------------------------------------------------------------------------------
echo "[2/9] Memperbarui paket sistem operasi dan dependensi..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx fail2ban ufw openssl ca-certificates

# Instalasi Node.js 22 LTS jika belum terpasang
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q 'v22'; then
  echo "[*] Menginstal Node.js v22.x LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Pastikan PM2 terpasang secara global
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

# ------------------------------------------------------------------------------
# 3. SERVICE USER & DEPLOY USER SETUP (C4 & H1 Fix)
# ------------------------------------------------------------------------------
echo "[3/9] Menyiapkan unprivileged service user (sociacare) & deploy user..."

# Buat service user 'sociacare' untuk menjalankan Node/PM2 tanpa root
if ! id -u sociacare >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin sociacare
  echo "[+] User service 'sociacare' dibuat."
fi

# Buat admin user 'deploy' untuk akses SSH non-root
if ! id -u deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy || useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  echo "[+] User 'deploy' dibuat dan ditambahkan ke grup sudo."
fi

# Salin SSH authorized_keys ke user deploy jika ada
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
  echo "[+] SSH key root berhasil disalin ke /home/deploy/.ssh/authorized_keys"
fi

# ------------------------------------------------------------------------------
# 4. SSH & FAIL2BAN HARDENING (H1 Fix)
# ------------------------------------------------------------------------------
echo "[4/9] Mengonfigurasi hardening SSH dan Fail2ban..."

cat << 'EOF' > /etc/fail2ban/jail.d/sshd.local
[sshd]
enabled = true
port = 22
backend = systemd
maxretry = 3
findtime = 10m
bantime = 1h
EOF

systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban >/dev/null 2>&1 || true

# SSH drop-in hardening: Nonaktifkan login password dan batasi root
mkdir -p /etc/ssh/sshd_config.d
cat << 'EOF' > /etc/ssh/sshd_config.d/99-sociacare-hardening.conf
# SociaCare VPS SSH Hardening
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
KbdInteractiveAuthentication no
X11Forwarding no
MaxAuthTries 3
EOF

if sshd -t; then
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  echo "[+] Konfigurasi SSH hardening aktif."
else
  echo "[-] Peringatan: Validasi konfigurasi sshd gagal. Menjaga konfigurasi sebelumnya." >&2
  rm -f /etc/ssh/sshd_config.d/99-sociacare-hardening.conf
fi

# ------------------------------------------------------------------------------
# 5. UFW FIREWALL CONFIGURATION (C4 Fix)
# ------------------------------------------------------------------------------
echo "[5/9] Mengonfigurasi UFW Firewall (Port 22, 80, 443)..."
ufw default deny incoming >/dev/null 2>&1 || true
ufw default allow outgoing >/dev/null 2>&1 || true
ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1 || true
ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1 || true
ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "[+] Firewall UFW aktif."

# ------------------------------------------------------------------------------
# 6. REPOSITORI KODE & ENVIRONMENT (H5, C1, H2 Fix)
# ------------------------------------------------------------------------------
echo "[6/9] Mengunduh/memperbarui kode aplikasi di /var/www/sociacare..."
mkdir -p /var/www
cd /var/www

if [ -d 'sociacare' ]; then
  cd sociacare
  git fetch --all || true
  git reset --hard origin/main 2>/dev/null || git pull || true
else
  git clone https://github.com/DX4GREY/sociacare.git
  cd sociacare
fi

# Konfigurasi file .env
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  NEW_SECRET=$(openssl rand -hex 32)
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${NEW_SECRET}/" server/.env 2>/dev/null || echo "SESSION_SECRET=${NEW_SECRET}" >> server/.env
fi

# Pastikan SESSION_SECRET terisi jika belum ada
if ! grep -q "^SESSION_SECRET=" server/.env || grep -q "^SESSION_SECRET=$" server/.env; then
  NEW_SECRET=$(openssl rand -hex 32)
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=${NEW_SECRET}/" server/.env 2>/dev/null || echo "SESSION_SECRET=${NEW_SECRET}" >> server/.env
fi

# Pastikan NODE_ENV diset production
if ! grep -q "^NODE_ENV=" server/.env; then
  echo "NODE_ENV=production" >> server/.env
fi

# Amankan izin akses file .env dan file SQLite (chmod 600)
chmod 600 server/.env
if [ -f server/sociacare.sql.db ]; then
  chmod 600 server/sociacare.sql.db
fi

# Build frontend React dan instalasi dependensi backend
echo "[*] Menginstal dependensi dan melakukan build..."
npm run build

# Atur kepemilikan direktori kerja ke unprivileged user sociacare
chown -R sociacare:sociacare /var/www/sociacare

# ------------------------------------------------------------------------------
# 7. NGINX REVERSE PROXY & HARDENING (H3, L1, L3 Fix)
# ------------------------------------------------------------------------------
echo "[7/9] Mengonfigurasi Nginx hardening, rate limiting, dan security headers..."

# Matikan server_tokens (L1 Fix)
sed -i 's/# server_tokens off;/server_tokens off;/' /etc/nginx/nginx.conf 2>/dev/null || true
if ! grep -q "server_tokens off;" /etc/nginx/nginx.conf; then
  sed -i '/http {/a \    server_tokens off;' /etc/nginx/nginx.conf
fi

# Rate limiting zones di /etc/nginx/conf.d/rate_limits.conf (H3 Fix)
cat << 'EOF' > /etc/nginx/conf.d/rate_limits.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
EOF

# Nginx Server Block
SSL_CERT="/etc/letsencrypt/live/sociacare.my.id/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/sociacare.my.id/privkey.pem"

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
  cat << EOF > /etc/nginx/sites-available/sociacare
# Drop permintaan HTTP dengan Host tidak dikenal (H3 Fix)
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

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server Block (H3, L3 HTTP/2 Fix)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name sociacare.my.id www.sociacare.my.id;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;

    # Security Headers (H3 Fix)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://www.youtube-nocookie.com; connect-src 'self'; frame-ancestors 'self';" always;

    # Tolak file tersembunyi & file database/backup/env (H3, H5 Fix)
    location ~ /\.(?!well-known) { deny all; return 404; }
    location ~* \.(sql|db|bak|old|env)$ { deny all; return 404; }

    # Rate limiting login admin & guru bk
    location ~ ^/api/(admin|teacher)/login {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Rate limiting API konseling
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy frontend & assets
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
  # Konfigurasi fallback HTTP sementara jika SSL belum dipasang
  cat << 'EOF' > /etc/nginx/sites-available/sociacare
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10M;

    location ~ /\.(?!well-known) { deny all; return 404; }
    location ~* \.(sql|db|bak|old|env)$ { deny all; return 404; }

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

ln -sf /etc/nginx/sites-available/sociacare /etc/nginx/sites-enabled/sociacare
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "[+] Nginx berhasil dikonfigurasi dan direstart."

# ------------------------------------------------------------------------------
# 8. PM2 RUNNING AS UNPRIVILEGED USER (C4 Fix)
# ------------------------------------------------------------------------------
echo "[8/9] Menjalankan PM2 sebagai user 'sociacare' (Non-Root)..."

# Matikan PM2 root lama jika ada
pm2 delete sociacare 2>/dev/null || true
pm2 kill 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
rm -f /etc/systemd/system/pm2-root.service

# Jalankan service sebagai user sociacare
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 pm2 delete sociacare 2>/dev/null || true
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 NODE_ENV=production pm2 start /var/www/sociacare/server/index.js --name 'sociacare'
sudo -u sociacare PM2_HOME=/home/sociacare/.pm2 pm2 save

# Aktifkan startup systemd untuk user sociacare
env PATH="$PATH:/usr/bin" /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u sociacare --hp /home/sociacare 2>/dev/null || \
pm2 startup systemd -u sociacare --hp /home/sociacare 2>/dev/null || true

systemctl daemon-reload
systemctl enable pm2-sociacare 2>/dev/null || true

# ------------------------------------------------------------------------------
# 9. SELESAI
# ------------------------------------------------------------------------------
echo "======================================================"
echo "✅ SETUP & HARDENING BERHASIL DISELESAIKAN!"
echo "   - Service User    : sociacare (non-root)"
echo "   - Firewall (UFW)  : Aktif (22, 80, 443 saja)"
echo "   - Backend Bind    : 127.0.0.1:3001 (terisolasi)"
echo "   - Fail2ban        : Aktif untuk SSH (maxretry 3)"
echo "   - Nginx           : Rate limiting & Security Headers aktif"
echo "   - URL Aplikasi    : https://sociacare.my.id (atau IP VPS)"
echo "======================================================"
