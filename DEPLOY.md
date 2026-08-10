# Deployment Guide — Oracle Linux

Enterprise production deployment for the Credit Risk Underwriting Desk on Oracle Linux 8/9.

## Architecture

```
┌──────────────────────────────────────────┐
│              Oracle Linux Server          │
│                                          │
│  ┌──────────┐     ┌──────────────────┐  │
│  │ Ollama   │     │ FastAPI Backend   │  │
│  │ :11434   │────▶│ :8000 (internal)  │  │
│  │          │     │ model + SHAP + LLM│  │
│  └──────────┘     └────────┬─────────┘  │
│                            │             │
│  ┌──────────────────┐     │             │
│  │ Next.js Frontend  │     │             │
│  │ :3000 (production)│◀────┘             │
│  │ served via Nginx   │                  │
│  └──────┬───────────┘                    │
│         │                                │
│  ┌──────┴───────────┐                    │
│  │ Nginx :80/:443    │                   │
│  │ reverse proxy     │                   │
│  └──────────────────┘                    │
└──────────────────────────────────────────┘
```

---

## Prerequisites

### 1. Oracle Linux version

```bash
cat /etc/oracle-release
# Oracle Linux Server 8.x or 9.x
```

### 2. Install system packages

```bash
sudo dnf update -y
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl git nginx python3.12 python3.12-devel
```

### 3. Install Node.js 20

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node --version   # v20.x
```

### 4. Install uv (Python package manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv --version
```

### 5. Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable ollama
sudo systemctl start ollama
```

Pull the explanation model:

```bash
ollama pull granite4.1:3b
ollama list
```

---

## Application Setup

### 1. Clone the repository

```bash
cd /opt
sudo mkdir -p credit-risk-app
sudo chown $USER:$USER credit-risk-app
git clone https://github.com/Hari-jmr/credit_ml.git /opt/credit-risk-app
cd /opt/credit-risk-app
```

### 2. Model artifacts

Copy the `model_outputs/` directory (from your Jupyter notebook run) into the backend:

```bash
cp -r /path/to/model_outputs credit-risk-backend/
ls credit-risk-backend/model_outputs/best_model.pkl   # verify exists
```

### 3. Backend setup

```bash
cd credit-risk-backend
uv sync
```

Test the backend:

```bash
uv run uvicorn app:app --host 0.0.0.0 --port 8000 &
curl http://localhost:8000/health
```

If it returns JSON with `model`, `test_roc_auc`, stop the test process (`fg` then `Ctrl+C`).

### 4. Frontend setup

```bash
cd /opt/credit-risk-app/credit-risk-ui
npm install
npm run build
```

---

## Environment Configuration

### Backend environment variables (optional)

```bash
# /opt/credit-risk-app/credit-risk-backend/.env
MODEL_DIR=model_outputs
OLLAMA_MODEL=granite4.1:3b
```

### Frontend environment variables

```bash
# /opt/credit-risk-app/credit-risk-ui/.env.production
NEXT_PUBLIC_API_URL=http://localhost:8000
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
ExecStart=/root/.local/bin/uv run uvicorn app:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment="MODEL_DIR=model_outputs"
Environment="OLLAMA_MODEL=granite4.1:3b"

[Install]
WantedBy=multi-user.target
EOF
```

### Frontend service

```bash
sudo tee /etc/systemd/system/credit-risk-ui.service << 'EOF'
[Unit]
Description=Credit Risk UI (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/credit-risk-app/credit-risk-ui
ExecStart=/usr/bin/node /opt/credit-risk-app/credit-risk-ui/node_modules/.bin/next start --port 3000
Restart=always
RestartSec=5
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF
```

### Start services

```bash
sudo systemctl daemon-reload
sudo systemctl enable credit-risk-backend credit-risk-ui
sudo systemctl start credit-risk-backend credit-risk-ui
sudo systemctl status credit-risk-backend
sudo systemctl status credit-risk-ui
```

---

## Nginx Reverse Proxy

```bash
sudo tee /etc/nginx/conf.d/credit-risk.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Next.js frontend
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

    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

sudo systemctl enable nginx
sudo systemctl restart nginx
```

---

## SELinux / Firewall

### Allow ports

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### SELinux (if enforced)

```bash
# Allow Nginx to proxy to backend ports
sudo setsebool -P httpd_can_network_connect 1

# If using non-standard ports
sudo semanage port -a -t http_port_t -p tcp 3000
sudo semanage port -a -t http_port_t -p tcp 8000
```

---

## Verify

```bash
# Services running
sudo systemctl status ollama credit-risk-backend credit-risk-ui nginx

# Backend health check
curl http://localhost:8000/health

# Frontend accessible via Nginx
curl http://localhost/
```

Open the server IP in your browser.

---

## Troubleshooting

| Issue | Check |
|---|---|
| Backend won't start | `uv sync` completed? `model_outputs/` exists? Ollama running? |
| SHAP errors | Python must be 3.12. 3.13 has dependency gaps with shap/numba |
| Frontend 500 errors | Run `npm run build` first. `.env.production` set? |
| Nginx 502 | Backend/frontend services running? `sudo systemctl status` |
| Ollama slow on first request | Model loading into memory — warm-up: `curl http://localhost:11434/api/generate -d '{"model":"granite4.1:3b","prompt":"Hello"}'` |

---

## Logs

```bash
# Backend logs
sudo journalctl -u credit-risk-backend -f

# Frontend logs
sudo journalctl -u credit-risk-ui -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ollama logs
sudo journalctl -u ollama -f
```
