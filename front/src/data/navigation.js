export const navigationGroups = [
  {
    label: "포트폴리오",
    items: [
      { label: "내 포트폴리오", path: "/portfolio/my" },
      { label: "배당 성장 추적기", path: "/portfolio/dividend-growth" },
      { label: "월 배당 캘린더", path: "/portfolio/monthly-calendar" },
    ],
  },
  {
    label: "계산기",
    items: [
      { label: "평단가 계산기", path: "/calculators/average-price" },
      { label: "ETF 배당 계산기", path: "/calculators/etf-dividend" },
      { label: "FIRE 계산기", path: "/calculators/fire" },
      { label: "은퇴 계산기", path: "/calculators/retirement" },
      { label: "적립식 투자 계산기", path: "/calculators/dca" },
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
    items: [{ label: "블로그", path: "/blog" }],
  },
];
