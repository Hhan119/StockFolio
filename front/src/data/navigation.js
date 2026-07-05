export const navigationGroups = [
  {
    label: "홈",
    items: [{ label: "홈", path: "/" }],
  },
  {
    label: "계산기",
    items: [
      { label: "ETF 배당 계산기", path: "/calculators/etf-dividend" },
      { label: "월배당 계산기", path: "/calculators/monthly-dividend" },
      { label: "FIRE 계산기", path: "/calculators/fire" },
      { label: "은퇴 계산기", path: "/calculators/retirement" },
      { label: "적립식 투자 계산기", path: "/calculators/dca" },
      { label: "복리 계산기", path: "/calculators/compound" },
      { label: "배당 재투자 계산기", path: "/calculators/dividend-reinvestment" },
      { label: "평단가 계산기", path: "/calculators/average-price" },
    ],
  },
  {
    label: "ETF",
    items: [
      { label: "ETF 탐색", path: "/etf" },
      { label: "ETF 검색", path: "/etf/search" },
      { label: "ETF 비교", path: "/etf/compare" },
      { label: "고배당 ETF 순위", path: "/etf/rankings/high-dividend" },
      { label: "월배당 ETF 순위", path: "/etf/rankings/monthly-dividend" },
      { label: "배당 성장 ETF 순위", path: "/etf/rankings/dividend-growth" },
    ],
  },
  {
    label: "배당",
    items: [
      { label: "배당 캘린더", path: "/dividends/calendar" },
      { label: "배당금 기초 가이드", path: "/dividends/guide" },
      { label: "커버드콜 ETF 순위", path: "/etf/rankings/covered-call" },
      { label: "국내 월배당 ETF 순위", path: "/etf/rankings/korea-listed-monthly" },
    ],
  },
  {
    label: "포트폴리오",
    items: [
      { label: "내 포트폴리오", path: "/portfolio/my" },
      { label: "보유 종목", path: "/portfolio/holdings" },
      { label: "월 배당 캘린더", path: "/portfolio/monthly-calendar" },
      { label: "배당 성장 추적기", path: "/portfolio/dividend-growth" },
    ],
  },
  {
    label: "분석",
    items: [
      { label: "포트폴리오 분석", path: "/analysis/portfolio" },
      { label: "배당 분석", path: "/analysis/dividend" },
      { label: "리밸런싱", path: "/analysis/rebalancing" },
      { label: "AI 분석", path: "/analysis/ai" },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { label: "블로그", path: "/blog" },
      { label: "서비스 소개", path: "/about" },
      { label: "문의하기", path: "/contact" },
      { label: "개인정보처리방침", path: "/privacy" },
      { label: "이용약관", path: "/terms" },
      { label: "면책 고지", path: "/disclaimer" },
    ],
  },
];
