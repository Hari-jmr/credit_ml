# Deployment Guide — Oracle Linux

## Quick Setup

### 1. System packages

```bash
sudo dnf update -y
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl git nginx python3.12 python3.12-devel
```

### 2. Node.js 20

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### 3. uv (Python package manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

### 4. Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
ollama pull granite4.1:3b
```

---

## Application Setup

### 1. Clone and prepare

```bash
git clone https://github.com/Hari-jmr/credit_ml.git /opt/credit-risk-app
cd /opt/credit-risk-app

cp credit-risk-backend/.env.example credit-risk-backend/.env
cp credit-risk-ui/.env.example credit-risk-ui/.env.local

# Copy model artifacts from your notebook run
cp -r /path/to/model_outputs credit-risk-backend/
```

### 2. Configure environment — **REQUIRED before next steps**

Edit these files if you need different ports or URLs:

**`credit-risk-backend/.env`** — backend configuration

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `8000` | Port the FastAPI backend listens on |
| `MODEL_DIR` | `model_outputs` | Path to model artifacts folder |
| `OLLAMA_MODEL` | `granite4.1:3b` | Ollama model to use for explanations |

**`credit-risk-ui/.env.local`** — frontend configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the Next.js frontend listens on |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL (must match backend port) |

> **Important**: `NEXT_PUBLIC_API_URL` is baked at build time for production. If you change the backend port after building, you must rebuild the frontend.

### 3. Backend

```bash
cd /opt/credit-risk-app/credit-risk-backend
uv sync

# Quick test
uv run serve &
curl http://localhost:8000/health
# Ctrl+C to stop
```

### 4. Frontend

```bash
cd /opt/credit-risk-app/credit-risk-ui
npm install
npm run build
```

---

## Production Services (systemd)

### Backend service

```bash
sudo tee /etc/systemd/system/credit-risk-backend.service << 'EOF'
[Unit]
Description=Credit Risk Prediction API
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/credit-risk-app/credit-risk-backend
EnvironmentFile=/opt/credit-risk-app/credit-risk-backend/.env
ExecStart=/root/.local/bin/uv run uvicorn app:app --host 127.0.0.1 --port ${API_PORT} --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Frontend service

```bash
sudo tee /etc/systemd/system/credit-risk-ui.service << 'EOF'
[Unit]
Description=Credit Risk UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/credit-risk-app/credit-risk-ui
ExecStart=/usr/bin/node /opt/credit-risk-app/credit-risk-ui/node_modules/.bin/next start --port ${PORT:-3000}
Restart=always
RestartSec=5
Environment="NODE_ENV=production"
EnvironmentFile=/opt/credit-risk-app/credit-risk-ui/.env.local

[Install]
WantedBy=multi-user.target
EOF
```

### Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now credit-risk-backend credit-risk-ui
sudo systemctl status credit-risk-backend credit-risk-ui
```

---

## Nginx

```bash
sudo tee /etc/nginx/conf.d/credit-risk.conf << 'EOF'
server {
    listen 80;
    server_name _;

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo systemctl enable --now nginx
```

---

## Firewall & SELinux

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# SELinux — allow Nginx to proxy
sudo setsebool -P httpd_can_network_connect 1
```

---

## Verify

```bash
curl http://localhost:8000/health   # backend
curl http://localhost:3000          # frontend
curl http://localhost/              # via Nginx
```

Open `http://<server-ip>` in your browser.

---

## Logs

```bash
sudo journalctl -u credit-risk-backend -f
sudo journalctl -u credit-risk-ui -f
sudo journalctl -u ollama -f
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend won't start | `uv sync` done? `model_outputs/` exists? Ollama running? |
| SHAP / numba errors | Use Python 3.12 — 3.13 has compatibility gaps |
| Frontend 500 | Run `npm run build` first. `NEXT_PUBLIC_API_URL` correct? |
| Port already in use | Edit `.env` files, restart services |
| Nginx 502 | Backend/frontend services running? Check `systemctl status` |

---

## Docker (alternative to systemd)

Ollama must run on the host. Update the server IP in `docker-compose.yml`.

```bash
cp -r /path/to/model_outputs credit-risk-backend/
docker compose up -d --build
```

| Service | Container Port | Host Port |
|---|---|---|
| Backend | 8000 | 5230 |
| Frontend | 3000 | 3535 |

Logs: `docker compose logs -f`

## Docker (alternative to systemd)

Ollama must run on the host with `OLLAMA_HOST=0.0.0.0`.

```bash
cp -r /path/to/model_outputs credit-risk-backend/
docker compose up -d --build
```

| Service | Port |
|---|---|
| Frontend | http://192.168.0.166:3535 |
| Backend | http://192.168.0.166:5230 |

Logs: `docker compose logs -f`
