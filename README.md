# StockFolio Local PC Server Deployment

StockFolio를 실제 클라우드 서버 없이 개인 PC에서 Docker Compose로 실행하고, 공유기 포트포워딩과 도메인/DDNS를 통해 외부에서 접속할 수 있게 구성하는 방법입니다.

## 구성

- Frontend: React Vite 정적 빌드
- Backend: Spring Boot, Java 17
- Database: PostgreSQL
- Cache: Redis
- Reverse Proxy: Nginx
- Runtime: Docker Compose

현재 저장소 구조에 맞춰 Dockerfile은 아래 위치에 있습니다.

- Frontend Dockerfile: `front/Dockerfile`
- Backend Dockerfile: `back/StockFolio/Dockerfile`
- Compose: `docker-compose.local-server.yml`
- Nginx: `nginx/nginx.conf`

## 실행 방법

1. Docker Desktop을 설치하고 실행합니다.
2. 루트 폴더에서 환경변수 파일을 만듭니다.

```powershell
Copy-Item .env.local-server.example .env.local-server
```

3. `.env.local-server` 값을 본인 환경에 맞게 수정합니다.

특히 아래 값은 반드시 바꾸세요.

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `DOMAIN_URL`
- `FRONTEND_URL`
- 필요한 경우 `FINANCIAL_API_KEY`, `FINNHUB_API_KEY`, `KIS_APP_KEY`, `KIS_APP_SECRET`

4. 전체 서비스를 실행합니다.

```powershell
docker compose -f docker-compose.local-server.yml up -d --build
```

5. 상태를 확인합니다.

```powershell
docker compose -f docker-compose.local-server.yml ps
```

6. 브라우저에서 접속합니다.

```text
http://localhost
```

백엔드 헬스체크:

```text
http://localhost/api/health
```

## 서비스 노출 구조

외부에 직접 노출되는 컨테이너는 `nginx`뿐입니다.

- `nginx`: 외부 `80`, `443` 포트 노출
- `backend`: Docker 내부 네트워크에서만 접근
- `postgres`: Docker 내부 네트워크에서만 접근
- `redis`: Docker 내부 네트워크에서만 접근
- `frontend`: React build 결과를 Docker volume에 복사

React 정적 파일은 Nginx가 `/usr/share/nginx/html`에서 서빙합니다.

- `/`: React 정적 파일
- `/api`: Spring Boot backend reverse proxy
- React Router 새로고침 fallback: `try_files $uri $uri/ /index.html`

## 개인 PC 외부 접속 설정

### 1. 내 PC 내부 IP 확인

Windows PowerShell:

```powershell
ipconfig
```

사용 중인 네트워크 어댑터의 `IPv4 주소`를 확인합니다.

예:

```text
192.168.0.25
```

가능하면 공유기에서 이 PC에 고정 DHCP를 설정해 내부 IP가 바뀌지 않게 하세요.

### 2. 공유기 포트포워딩 설정

공유기 관리자 페이지에 접속합니다.

일반적인 주소:

```text
http://192.168.0.1
http://192.168.1.1
```

포트포워딩 규칙:

```text
외부 TCP 80  -> 내 PC 내부 IP 80
외부 TCP 443 -> 내 PC 내부 IP 443
```

예:

```text
80  -> 192.168.0.25:80
443 -> 192.168.0.25:443
```

### 3. Windows 방화벽 허용

Windows Defender 방화벽에서 인바운드 규칙을 추가합니다.

- TCP 80 허용
- TCP 443 허용

PowerShell 관리자 권한 예시:

```powershell
New-NetFirewallRule -DisplayName "StockFolio HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "StockFolio HTTPS 443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

### 4. 공인 IP 확인

브라우저에서 아래 검색어를 입력합니다.

```text
내 공인 IP
```

또는 PowerShell:

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org").Content
```

### 5. 도메인 연결

도메인 DNS 관리 화면에서 A 레코드를 추가합니다.

```text
Type: A
Name: @ 또는 원하는 서브도메인
Value: 내 공인 IP
TTL: Auto 또는 300
```

예:

```text
stockfolio.example.com -> 123.123.123.123
```

`.env.local-server`도 맞춥니다.

```env
DOMAIN_URL=http://stockfolio.example.com
FRONTEND_URL=http://stockfolio.example.com
BACKEND_URL=http://stockfolio.example.com/api
```

### 6. 공인 IP가 자주 바뀌는 경우

가정용 인터넷은 공인 IP가 바뀔 수 있습니다.

이 경우 아래 중 하나를 사용하세요.

- 공유기 DDNS 기능
- ipTIME DDNS
- DuckDNS
- Cloudflare DNS API 자동 갱신

DDNS를 쓰면 도메인을 고정 IP 대신 DDNS 주소로 연결합니다.

### 7. 외부 접속 테스트

같은 Wi-Fi가 아닌 환경에서 테스트합니다.

- 휴대폰 Wi-Fi 끄기
- LTE/5G 상태에서 접속
- `http://도메인` 또는 `http://공인IP`
- `http://도메인/api/health`

## HTTPS 선택사항

현재 설정은 HTTP 80 기준입니다.

HTTPS를 쓰려면 아래 중 하나를 선택하세요.

### 방법 A. Certbot

Nginx에 443 SSL server block을 추가하고 Let's Encrypt 인증서를 발급합니다.

주의:

- 80 포트가 외부에서 접근 가능해야 합니다.
- 인증서 파일을 Docker volume으로 관리해야 합니다.
- Windows 개인 PC 환경에서는 경로와 권한 관리가 번거로울 수 있습니다.

### 방법 B. Cloudflare Tunnel

공유기 포트포워딩이 어렵거나 CGNAT 환경이면 Cloudflare Tunnel을 고려하세요.

장점:

- 공유기 포트포워딩 없이 외부 접속 가능
- HTTPS 제공이 쉬움
- 공인 IP 변경 영향을 줄일 수 있음

### 방법 C. ngrok

테스트 목적으로는 ngrok도 사용할 수 있습니다.

운영용보다는 임시 테스트에 적합합니다.

## 보안 주의사항

반드시 읽으세요.

- 개인 PC를 외부에 노출하면 보안 위험이 있습니다.
- PostgreSQL, Redis 포트는 외부에 절대 노출하지 않습니다.
- Nginx 80/443만 외부에 노출합니다.
- `JWT_SECRET`은 강력한 랜덤 문자열을 사용합니다.
- `.env.local-server`는 Git에 올리지 않습니다.
- 운영 중 PC가 꺼지면 사이트도 접속되지 않습니다.
- 인터넷 회선 또는 공유기 환경에 따라 외부 접속이 막힐 수 있습니다.
- 통신사 공유기 또는 CGNAT 환경이면 포트포워딩이 안 될 수 있습니다.
- CGNAT 환경에서는 Cloudflare Tunnel 또는 ngrok 같은 터널링 방식을 고려합니다.
- 관리자 비밀번호, DB 비밀번호, API Key는 주기적으로 교체하세요.

## 운영 명령어

로그 확인:

```powershell
docker compose -f docker-compose.local-server.yml logs -f
```

특정 서비스 로그:

```powershell
docker compose -f docker-compose.local-server.yml logs -f backend
docker compose -f docker-compose.local-server.yml logs -f nginx
```

재시작:

```powershell
docker compose -f docker-compose.local-server.yml restart
```

중지:

```powershell
docker compose -f docker-compose.local-server.yml down
```

DB 데이터까지 삭제:

```powershell
docker compose -f docker-compose.local-server.yml down -v
```

주의: `down -v`는 PostgreSQL volume 데이터도 삭제합니다.
