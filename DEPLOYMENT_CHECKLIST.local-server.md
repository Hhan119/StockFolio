# StockFolio 개인 PC Docker 배포 체크리스트

## 1. 로컬 준비

- [ ] Docker Desktop 설치
- [ ] Docker Desktop 실행 확인
- [ ] 루트 폴더에서 `.env.local-server.example`을 `.env.local-server`로 복사
- [ ] `POSTGRES_PASSWORD` 변경
- [ ] `JWT_SECRET`을 강력한 랜덤 문자열로 변경
- [ ] `DOMAIN_URL`, `FRONTEND_URL`, `BACKEND_URL` 수정
- [ ] 필요한 금융 API Key 입력

## 2. Docker 실행

- [ ] 아래 명령어 실행

```powershell
docker compose -f docker-compose.local-server.yml up -d --build
```

- [ ] 컨테이너 상태 확인

```powershell
docker compose -f docker-compose.local-server.yml ps
```

- [ ] 백엔드 헬스체크 확인

```text
http://localhost/api/health
```

- [ ] 프론트 접속 확인

```text
http://localhost
```

## 3. 네트워크 설정

- [ ] `ipconfig`로 내 PC 내부 IP 확인
- [ ] 공유기 DHCP 고정 또는 내부 IP 고정 설정
- [ ] 공유기 포트포워딩 설정

```text
TCP 80  -> 내 PC 80
TCP 443 -> 내 PC 443
```

- [ ] Windows 방화벽에서 TCP 80 허용
- [ ] Windows 방화벽에서 TCP 443 허용
- [ ] 공인 IP 확인
- [ ] 도메인 A 레코드를 공인 IP로 연결
- [ ] 공인 IP가 자주 바뀌면 DDNS 설정

## 4. 외부 접속 테스트

- [ ] 휴대폰 Wi-Fi 끄기
- [ ] LTE/5G에서 `http://도메인` 접속
- [ ] `http://도메인/api/health` 접속
- [ ] React Router 새로고침 테스트
- [ ] 로그인/회원가입 테스트
- [ ] 종목 검색 테스트

## 5. 보안 확인

- [ ] PostgreSQL 포트 외부 미노출 확인
- [ ] Redis 포트 외부 미노출 확인
- [ ] Nginx 80/443만 외부 노출 확인
- [ ] `.env.local-server`가 Git에 포함되지 않는지 확인
- [ ] DB 비밀번호와 JWT_SECRET이 기본값이 아닌지 확인
- [ ] 공유기 관리자 비밀번호가 안전한지 확인

## 6. HTTPS 선택

- [ ] HTTP로 먼저 정상 동작 확인
- [ ] HTTPS가 필요하면 Certbot, Cloudflare Tunnel, ngrok 중 선택
- [ ] CGNAT 환경이면 Cloudflare Tunnel 또는 ngrok 검토

## 7. 장애 대응

- [ ] 컨테이너 로그 확인 방법 숙지

```powershell
docker compose -f docker-compose.local-server.yml logs -f
```

- [ ] PC 절전 모드 해제
- [ ] Docker Desktop 자동 시작 설정 검토
- [ ] 정전/재부팅 후 컨테이너 자동 시작 확인
