# StockFolio ETF Analytics Implementation Report

## Summary

ETF 검색, 상세, 비교, 랭킹, 규칙 기반 분석, 교육용 모델 포트폴리오가 동일한 백엔드 표준 스냅샷을 사용하도록 리팩터링했다. 프론트엔드는 금융 API를 직접 호출하지 않는다.

숫자 데이터가 없는 경우 임의 값을 생성하지 않고 `null`과 데이터 품질 상태로 반환한다. 프론트에서는 이를 `N/A`로 표시한다.

## Data Flow

```text
FMP / KRX Open API / OpenDART
  -> Naver Finance / Yahoo Finance fallback
  -> MarketDataService raw snapshot
  -> EtfAnalyticsService standardization
  -> search / detail / compare / ranking / methodology / model portfolio
  -> React Query API layer
```

## Standard Classification

모든 ETF 화면이 다음 분류를 공통 사용한다.

- 상장 국가: `KR`, `US`
- 자산 유형: 주식, 채권, 단기채권, 리츠, 원자재, 혼합자산
- 전략: 시장대표, 배당, 배당성장, 고배당, 커버드콜, 성장, 액티브, 레버리지, 인버스
- 분배 주기: 최근 370일 실제 지급 이력 기준
- 환 노출: 기본통화, 환헤지, 환노출, 해당 없음
- 비교군: `peerGroup`
- 위험 플래그: 커버드콜, 레버리지, 인버스, 단일종목

## Calculation Rules

- TTM 주당 분배금: 최근 370일 실제 주당 지급액 합계
- TTM 분배율: `TTM 주당 분배금 / 현재가 * 100`
- 분배금 변동성: 최근 지급액의 변동계수
- 3년/5년 분배 성장률: 완료된 연도별 지급액 합계의 CAGR
- 연속 성장 연수: 완료된 연도 기준 전년 대비 증가가 이어진 횟수
- 구성종목 중복도: 공통 종목별 `min(ETF A 비중, ETF B 비중)` 합계
- 데이터 품질: 현재가, 기본정보, 총보수, AUM, 성과, 구성종목, 분배금 이력 확보율

## Ranking Methodology

- 동일 `peerGroup` 안에서만 비교한다.
- 지표별 5~95 백분위 윈저라이징 후 백분위 점수를 계산한다.
- 결측 지표는 35점으로 처리하고 데이터 품질 감점을 별도로 적용한다.
- 레버리지와 인버스 ETF에는 위험 감점을 적용한다.
- 거래대금이 없을 때 AUM을 유동성 보조 지표로 사용한다.
- 가중치는 `/api/etfs/methodology`와 `/etf/methodology`에서 공개한다.

## Public API

- `GET /api/etfs/search?keyword=&market=ALL&limit=60`
- `GET /api/etfs/{ticker}?market=AUTO`
- `GET /api/etfs/compare?tickers=SCHD,VYM`
- `GET /api/etfs/rankings/{kind}?market=ALL&excludeCoveredCall=false`
- `GET /api/etfs/methodology`
- `POST /api/etfs/model-portfolios/simulate`

지원 랭킹:

- `high-dividend`
- `monthly-dividend`
- `dividend-growth`
- `covered-call`
- `korea-listed-monthly`

## Public Pages

- `/etf`: ETF 탐색 허브
- `/etf/search`: 국내·해외 ETF 검색
- `/etf/:ticker`: 표준 분류와 규칙 분석을 포함한 ETF 상세
- `/etf/compare`: 최대 4개 ETF 비교와 구성종목 중복도
- `/etf/rankings/:kind`: 비교군별 랭킹
- `/etf/methodology`: 데이터·점수 방법론
- `/etf/model-portfolios`: 위험성향·목적별 교육용 모델 포트폴리오

## Data Source Priority

1. FMP: 미국 주식·ETF·배당·재무·ETF 구성
2. KRX Open API: 국내 전체 종목·ETF 공식 정보
3. OpenDART: 국내 기업 재무·공시
4. 보조 소스: 네이버 증권, Yahoo Finance

각 응답은 기준 시각과 실제 사용된 소스를 포함한다.

## Verification

```powershell
cd back/StockFolio
mvn test

cd ../../front
npm.cmd run lint
npm.cmd run build
```

검증 결과:

- Spring Boot 테스트 8개 통과
- ETF 표준화, 월분배·커버드콜 분류, 분배 성장률, 데이터 품질, 구성종목 중복도 단위 테스트 통과
- ESLint 오류 및 경고 없음
- Vite production build 성공
- 390px 모바일, 1280px 노트북, 1600px 데스크톱 브라우저 확인
- 검색, 상세, 비교, 랭킹, 방법론, 모델 포트폴리오 API/UI 확인

## Known Limitations

- FMP API 키가 없으면 미국 ETF의 현재가와 분배금은 Yahoo Finance 보조 데이터를 사용한다. 이 경우 총보수, AUM, 구성종목, 장기 성과가 `N/A`일 수 있다.
- 현재 랭킹 대상은 목적별 검증 후보군이다. 전체 ETF 랭킹을 위해서는 ETF 마스터를 PostgreSQL에 적재하고 일일 배치로 갱신하는 후속 작업이 필요하다.
- API가 제공하지 않는 변동성, 최대 낙폭, 샤프지수는 추정하지 않는다.
- 모델 포트폴리오는 교육용 자산배분 예시이며 개인별 투자자문이나 자동매수 추천이 아니다.
- 실제 AdSense Publisher ID와 광고 스크립트는 포함하지 않는다.
