# StockFolio ETF Explorer Implementation Report

## Summary

기존 StockFolio 프로젝트를 새로 생성하지 않고, 기존 React/Vite/Tailwind 레이아웃과 인증/포트폴리오 라우팅을 유지한 상태에서 ETF 탐색 영역을 확장했다.

실제 금융 API는 아직 연결하지 않았으므로 모든 ETF 데이터는 `StockFolio mock ETF dataset` 기반 샘플 데이터이며, 화면에는 `샘플 데이터` 배지와 기준 시각을 표시한다.

## Main Routes

- `/etf`: ETF 탐색 허브
- `/etf/search`: ETF 검색
- `/etf/:slug`: ETF 상세
- `/etf/compare`: ETF 비교 도구
- `/etf/compare/:slug`: SEO용 ETF 비교 프리셋
- `/etf/rankings/high-dividend`: 고분배 ETF 순위
- `/etf/rankings/monthly-dividend`: 월분배 ETF 순위
- `/etf/rankings/dividend-growth`: 분배금 성장 ETF 순위

## Modified And Added Files

- `front/src/main.jsx`
  - TanStack Query `QueryClientProvider` 추가.

- `front/src/App.jsx`
  - ETF 허브, 검색, 상세, 비교, 순위 라우트 정리.

- `front/src/data/navigation.js`
  - ETF 탐색/검색/비교/순위 메뉴 구조 반영.

- `front/src/models/etfModels.js`
  - 현재 JS 프로젝트를 유지하면서 TypeScript 전환을 대비한 JSDoc ETF 모델 정의.

- `front/src/services/etfMockApi.js`
  - 공개 ETF API를 흉내 내는 Mock API 계층.
  - 검색, 상세, 성과, 분배금, 구성 종목, 유사 ETF, 비교, 순위 API 메서드 제공.

- `front/src/utils/etfCalculations.js`
  - CAGR, 총보수 비용 환산, 검색 필터, 정렬, 페이지네이션, 비교 개수 제한 유틸.

- `front/src/components/etf/index.jsx`
  - ETF 전용 재사용 컴포넌트.
  - `EtfSearchBox`, `EtfResultCard`, `EtfResultTable`, `EtfMetricCard`, `MetricHelpTooltip`, `BeginnerSummary`, `EtfBadge`, `RiskBadge`, `DataFreshnessBadge`, `CompareTray`, `EtfCompareTable`, `DistributionChart`, `TotalReturnChart`, `HoldingsTable`, `SectorAllocationChart`, `RankingMethodology`, `InvestmentDisclaimer`, `EmptyState`, `ErrorState`, `SkeletonState`, `AdSlot`.

- `front/src/pages/etf/EtfHubPage.jsx`
  - ETF 허브 페이지.
  - 대형 검색창, 인기 검색어, ETF 유형 바로가기, 많이 본 ETF, TOP 5 영역, 초보자 가이드, 계산기 연결.

- `front/src/pages/etf/EtfListPage.jsx`
  - ETF 검색 페이지.
  - 300ms debounce, 빠른 필터, 선택 chip, 검색 결과 개수, 카드/테이블 전환, 비교담기, 최근 검색어, 키보드 선택.

- `front/src/pages/etf/EtfDetailPage.jsx`
  - ETF 상세 페이지.
  - Hero, 핵심 지표 6개, tooltip, 초보자 설명, 적합성 안내, 성과/분배금/구성 종목/위험/비용 탭.

- `front/src/pages/etf/EtfCompareListPage.jsx`
  - ETF 비교 도구.
  - Query String 기반 선택 ETF 유지, ETF 추가 검색, 제거, 공유 URL, 최대 비교 개수 제한.

- `front/src/pages/etf/EtfComparePage.jsx`
  - SEO용 비교 프리셋 페이지.

- `front/src/pages/etf/EtfRankingPage.jsx`
  - 고분배, 월분배, 분배금 성장 순위 페이지 공통 구현.
  - 필터, 순위 기준, 데이터 기준일, 전략 배지, 광고 슬롯, 면책 문구 포함.

- `front/public/sitemap.xml`
  - `/etf/search` 및 ETF 공개 URL 반영.

- `front/scripts/verify-etf-content.mjs`
  - ETF 핵심 데이터 로직 검증 스크립트.

- `front/package.json`
  - `@tanstack/react-query` 의존성 및 `verify:etf` 스크립트 추가.

## Public API Contract

Frontend는 외부 금융 API를 직접 호출하지 않는다. Mock 제거 후 아래 Spring Boot 공개 API로 연결한다.

- `GET /api/public/etfs/search`
  - Pagination, Sorting, Filtering 적용.
- `GET /api/public/etfs/{ticker}`
- `GET /api/public/etfs/{ticker}/performance`
- `GET /api/public/etfs/{ticker}/distributions`
- `GET /api/public/etfs/{ticker}/holdings`
- `GET /api/public/etfs/{ticker}/similar`
- `GET /api/public/etfs/compare?tickers=SCHD,JEPI`
- `GET /api/public/etfs/rankings/high-dividend`
- `GET /api/public/etfs/rankings/monthly-dividend`
- `GET /api/public/etfs/rankings/dividend-growth`

모든 응답에는 다음 메타데이터를 포함해야 한다.

```json
{
  "asOf": "2026-07-05 15:30",
  "source": "provider name",
  "delayed": true,
  "mock": false,
  "currency": "USD"
}
```

## Mock Data Removal Points

실제 API 연결 시 우선 교체할 파일:

- `front/src/services/etfMockApi.js`

교체 방식:

- `etfMockApi.searchEtfs` → `GET /api/public/etfs/search`
- `etfMockApi.getEtf` → `GET /api/public/etfs/{ticker}`
- `etfMockApi.getPerformance` → `GET /api/public/etfs/{ticker}/performance`
- `etfMockApi.getDistributions` → `GET /api/public/etfs/{ticker}/distributions`
- `etfMockApi.getHoldings` → `GET /api/public/etfs/{ticker}/holdings`
- `etfMockApi.getSimilar` → `GET /api/public/etfs/{ticker}/similar`
- `etfMockApi.compareEtfs` → `GET /api/public/etfs/compare`
- `etfMockApi.getRanking` → ranking APIs

## Verification

```powershell
cd front
npm.cmd run verify:etf
npm.cmd run build
```

검증 항목:

- 검색 필터
- 비교담기 최대 개수
- 데이터 없음 처리
- API 오류 처리
- 순위 정렬
- CAGR 계산
- 총보수 비용 환산
- 예상일/확정일 구분

## Known Limitations

- ETF 데이터는 샘플 데이터이며 실제 가격, 분배금, 수익률, 구성 종목과 다를 수 있다.
- 차트는 외부 chart library 없이 Tailwind 기반 미니 차트로 구현했다.
- 모바일 레이아웃은 CSS 반응형으로 대응했으며 실제 기기별 수동 QA가 추가로 필요하다.
- FAQ 구조화 데이터와 Breadcrumb JSON-LD는 아직 컴포넌트화하지 않았다.
- 백엔드 공개 ETF API와 PostgreSQL/Redis 캐싱 구현은 다음 단계 작업이다.
- 실제 AdSense 스크립트와 Publisher ID는 하드코딩하지 않았다.
