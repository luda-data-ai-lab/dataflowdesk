# EC2 배포 가이드 (Ubuntu, nginx + systemd)

구성: nginx가 `df.ludaresearch.org`에서 빌드된 프론트(정적 파일)를 서비스하고 `/api`를 127.0.0.1:5174의 uvicorn(FastAPI)으로 프록시합니다.
DB는 SQLite(`data/ifmanager.db`)로 시작하고, 필요하면 `.env`만 바꿔 PostgreSQL로 전환합니다.

> 서버에 이미 3000/3001/5000/5001/5002 포트가 사용 중이므로 백엔드는 **5174**을 사용합니다.
> 포트/도메인을 바꾸려면 아래 명령의 `5174`, `df.ludaresearch.org`를 일괄 치환하세요.

## 0. 사전 확인

```bash
sudo ss -tlnp | grep 5174        # 비어 있어야 함
node -v && python3 --version     # Node 18+, Python 3.11+
```

DNS: Route53(또는 사용 중인 DNS)에 `df.ludaresearch.org` A 레코드 → EC2 공인 IP 추가.

## 1. 소스 받기

```bash
cd ~
git clone https://github.com/luda-data-ai-lab/dataflowdesk.git
cd dataflowdesk
```

## 2. 환경 파일

```bash
cp .env.example .env
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"   # 아래 SYSTEM_PASSWORD_KEY 값
python3 -c "import secrets; print(secrets.token_urlsafe(48))"                               # 아래 JWT_SECRET 값
nano .env
```

`.env`에서 반드시 바꿀 값:

```ini
DB_TYPE=sqlite
SQLITE_PATH=./data/ifmanager.db
SYSTEM_PASSWORD_KEY=<위에서 생성한 Fernet 키>
JWT_SECRET=<위에서 생성한 랜덤 문자열>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<초기 관리자 비밀번호>
BACKEND_PORT=5174
CORS_ORIGINS=https://df.ludaresearch.org
```

(Fernet 키 생성에 `cryptography`가 없다고 나오면 3단계 venv 설치 후 `.venv/bin/python -c ...`로 실행)

## 3. 백엔드

```bash
cd ~/dataflowdesk/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
.venv/bin/python seed.py            # 관리자 계정 생성 (+샘플 데이터)
```

> 샘플 데이터 없이 관리자 계정만 만들려면 `.venv/bin/python seed.py --admin-only`

systemd 서비스:

```bash
sudo tee /etc/systemd/system/dataflowdesk.service >/dev/null <<'UNIT'
[Unit]
Description=DataFlowDesk API (uvicorn)
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/dataflowdesk/backend
EnvironmentFile=/home/ubuntu/dataflowdesk/.env
ExecStart=/home/ubuntu/dataflowdesk/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 5174 --workers 1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now dataflowdesk
sudo systemctl status dataflowdesk --no-pager
curl -s http://127.0.0.1:5174/api/health      # {"status":"ok",...}
```

## 4. 프론트엔드 빌드

```bash
cd ~/dataflowdesk/frontend
npm ci
npm run build                       # → frontend/dist
```

API는 같은 도메인의 `/api`로 호출되므로 `VITE_API_BASE_URL`은 비워둡니다.

## 5. nginx + HTTPS

```bash
sudo tee /etc/nginx/sites-available/dataflowdesk >/dev/null <<'NGINX'
server {
    listen 80;
    server_name df.ludaresearch.org;

    root /home/ubuntu/dataflowdesk/frontend/dist;
    index index.html;
    client_max_body_size 20m;        # Excel 업로드 / 로고

    location /api/ {
        proxy_pass http://127.0.0.1:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri /index.html;   # React Router
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/dataflowdesk /etc/nginx/sites-enabled/dataflowdesk
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d df.ludaresearch.org
```

브라우저에서 https://df.ludaresearch.org 접속 → admin 로그인 → **사용자 관리**에서 비밀번호 변경.

## 6. 업데이트 배포

```bash
cd ~/dataflowdesk
git pull
cd backend && .venv/bin/pip install -r requirements.txt && .venv/bin/alembic upgrade head && cd ..
cd frontend && npm ci && npm run build && cd ..
sudo systemctl restart dataflowdesk
```

## 7. 백업

```bash
cp ~/dataflowdesk/data/ifmanager.db ~/backup/ifmanager_$(date +%F).db
```

또는 앱의 **인터페이스 목록 → 전체 백업(양식)** 으로 Excel 백업.

## 8. PostgreSQL로 전환(선택)

```bash
sudo -u postgres psql -c "CREATE USER ifmanager WITH PASSWORD '<pw>';" -c "CREATE DATABASE ifmanager OWNER ifmanager;"
```

`.env`: `DB_TYPE=postgresql`, `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=ifmanager`, `DB_USER=ifmanager`, `DB_PASSWORD=<pw>` → `alembic upgrade head` → `seed.py` → `systemctl restart dataflowdesk`.
기존 SQLite 데이터는 전체 백업 Excel을 내려받아 새 DB에 업로드하면 이관됩니다.

## 문제 해결

| 증상 | 확인 |
|---|---|
| 502 Bad Gateway | `sudo journalctl -u dataflowdesk -n 50` (백엔드 기동 실패: .env 값/권한) |
| 로그인 후 바로 로그아웃 | `JWT_SECRET` 변경 후 재시작했는지, 브라우저 localStorage 비우기 |
| 새로고침 시 404 | nginx `try_files $uri /index.html` 누락 |
| Excel 업로드 413 | `client_max_body_size` 확인 |
