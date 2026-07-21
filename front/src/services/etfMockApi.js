import { DATA_AS_OF, etfs, getComparison, rankingPages } from "../data/publicContent.js";
import { calculateAnnualCost, calculateCagr, filterEtfs, getListingRegion, paginate, sortEtfs } from "../utils/etfCalculations.js";

const API_LATENCY_MS = 240;
const MOCK_SOURCE = "StockFolio mock ETF dataset";

const sleep = (ms = API_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const makeMetadata = (currency = "USD") => ({
  asOf: `${DATA_AS_OF} 15:30`,
  source: MOCK_SOURCE,
  delayed: true,
  mock: true,
  currency,
});

const inferAssetType = (etf) => {
  if (etf.category.includes("리츠")) return "reit";
  if (etf.category.includes("채권")) return "bond";
  return "equity";
};

const inferObjectives = (etf) => {
  const objectives = ["long-term"];
  if (etf.category.includes("고배당") || etf.category.includes("월배당") || etf.dividendYield >= 4) objectives.push("income");
  if (etf.category.includes("배당 성장")) objectives.push("distribution-growth");
  if (etf.category.includes("성장") || etf.category.includes("나스닥")) objectives.push("growth");
  if (etf.category.includes("커버드콜")) objectives.push("monthly-cashflow");
  return objectives;
};

const inferStrategy = (etf) => {
  if (etf.category.includes("커버드콜")) return "옵션 프리미엄을 활용해 분배금 재원을 만드는 전략";
  if (etf.category.includes("배당 성장")) return "배당 지속성과 성장성을 함께 보는 전략";
  if (etf.category.includes("고배당")) return "상대적으로 높은 분배율을 추구하는 전략";
  if (etf.category.includes("나스닥")) return "나스닥 대형 성장주에 집중하는 전략";
  if (etf.category.includes("대표지수")) return "미국 대표 지수를 추종하는 시장대표 전략";
  return "분산된 ETF 포트폴리오 전략";
};

const inferIndexName = (etf) => {
  if (etf.ticker === "SCHD" || etf.name.includes("배당다우존스")) return "Dow Jones U.S. Dividend 100 계열";
  if (etf.ticker === "VOO" || etf.ticker === "SPY") return "S&P 500";
  if (etf.ticker === "QQQ" || etf.ticker === "QQQM" || etf.ticker === "JEPQ") return "Nasdaq 100 계열";
  if (etf.ticker === "VTI") return "CRSP US Total Market";
  if (etf.ticker === "DIA") return "Dow Jones Industrial Average";
  if (etf.category.includes("배당귀족")) return "S&P Dividend Aristocrats 계열";
  return `${etf.category} 대표 지수`;
};

const getFrequencyMultiplier = (frequency) => {
  if (frequency === "월") return 12;
  if (frequency === "분기") return 4;
  if (frequency === "반기") return 2;
  return 1;
};

const makeDistributionHistory = (etf) => {
  const multiplier = getFrequencyMultiplier(etf.dividendFrequency);
  const periods = Math.min(multiplier, 12);
  return Array.from({ length: periods }, (_, index) => {
    const month = String(12 - index).padStart(2, "0");
    const amount = Number((etf.latestDividend * (1 + ((index % 3) - 1) * 0.04)).toFixed(4));
    return {
      date: `2026-${month}-25`,
      amount,
      confirmed: index > 1,
    };
  }).reverse();
};

const makePerformance = (etf, index) => {
  const base = etf.category.includes("커버드콜") ? 4 : etf.category.includes("성장") || etf.category.includes("나스닥") ? 11 : 7;
  const oneYear = Number((base + (index % 5) * 1.3 - (etf.dividendYield > 8 ? 2 : 0)).toFixed(2));
  return {
    totalReturn: {
      oneMonth: Number((oneYear / 12 - 0.4).toFixed(2)),
      threeMonth: Number((oneYear / 4 - 0.7).toFixed(2)),
      oneYear,
      threeYear: Number((oneYear * 0.82).toFixed(2)),
      fiveYear: etf.market === "KRX" ? null : Number((oneYear * 0.76).toFixed(2)),
    },
    priceReturn: {
      oneMonth: Number((oneYear / 12 - etf.dividendYield / 12).toFixed(2)),
      threeMonth: Number((oneYear / 4 - etf.dividendYield / 4).toFixed(2)),
      oneYear: Number((oneYear - etf.dividendYield).toFixed(2)),
      threeYear: Number((oneYear * 0.7).toFixed(2)),
      fiveYear: etf.market === "KRX" ? null : Number((oneYear * 0.62).toFixed(2)),
    },
    distributionReturn: {
      oneYear: etf.dividendYield,
      threeYear: Number((etf.dividendYield * 0.94).toFixed(2)),
      fiveYear: etf.market === "KRX" ? null : Number((etf.dividendYield * 0.9).toFixed(2)),
    },
    series: ["1개월", "3개월", "1년", "3년", "5년"].map((period, periodIndex) => ({
      period,
      etf: Number((oneYear * [0.08, 0.25, 1, 0.82, 0.76][periodIndex]).toFixed(2)),
      index: Number((oneYear * [0.07, 0.22, 0.9, 0.78, 0.72][periodIndex]).toFixed(2)),
      categoryAverage: Number((oneYear * [0.06, 0.2, 0.82, 0.7, 0.65][periodIndex]).toFixed(2)),
    })),
  };
};

const makeRisk = (etf, index) => {
  const coveredCall = etf.category.includes("커버드콜");
  const sectorFocused = etf.sectors?.[0]?.[1] >= 40;
  return {
    volatility: Number((coveredCall ? 12 + index * 0.2 : 16 + index * 0.35).toFixed(2)),
    maxDrawdown: Number((coveredCall ? -18 - index * 0.2 : -24 - index * 0.28).toFixed(2)),
    beta: Number((coveredCall ? 0.72 : etf.category.includes("나스닥") ? 1.12 : 0.96).toFixed(2)),
    standardDeviation: Number((coveredCall ? 11.8 + index * 0.2 : 15.4 + index * 0.2).toFixed(2)),
    trackingError: Number((0.18 + (index % 4) * 0.08).toFixed(2)),
    premiumDiscount: Number((((index % 5) - 2) * 0.03).toFixed(2)),
    averageVolume: 100000 + index * 24000,
    bidAskSpread: Number((0.02 + (index % 4) * 0.01).toFixed(2)),
    badges: [
      coveredCall ? "커버드콜" : null,
      coveredCall ? "파생상품 활용" : null,
      sectorFocused ? "섹터 집중" : null,
      etf.category.includes("나스닥") ? "성장주 변동성" : null,
    ].filter(Boolean),
  };
};

const makeHoldings = (etf) =>
  etf.holdings.map((holding, index) => ({
    name: holding,
    ticker: holding.split(" ")[0].slice(0, 4).toUpperCase(),
    weight: Number(Math.max(2, 10 - index * 1.3).toFixed(2)),
  }));

const enhanceEtf = (etf, index) => {
  const listingRegion = getListingRegion(etf);
  const history = makeDistributionHistory(etf);
  const ttmDistributionAmount = etf.latestDividend * getFrequencyMultiplier(etf.dividendFrequency);
  const firstHistory = history[0]?.amount;
  const lastHistory = history[history.length - 1]?.amount;
  const metadata = makeMetadata(etf.currency);
  const risk = makeRisk(etf, index);
  const aum = listingRegion === "domestic" ? 120000000000 + index * 18000000000 : 2400000000 + index * 450000000;

  return {
    ...etf,
    listingRegion,
    regionLabel: listingRegion === "domestic" ? "국내" : "해외",
    assetType: inferAssetType(etf),
    objectives: inferObjectives(etf),
    managementStyle: etf.category.includes("커버드콜") ? "active" : "passive",
    indexName: inferIndexName(etf),
    strategy: inferStrategy(etf),
    aum,
    quote: {
      currentPrice: etf.price,
      change: Number((etf.price * (((index % 5) - 2) / 100)).toFixed(2)),
      changeRate: Number((((index % 5) - 2) * 0.42).toFixed(2)),
      currency: etf.currency,
      metadata,
    },
    beginnerDescription: etf.summary.split(".")[0] || etf.summary,
    distribution: {
      ttmDistributionRate: etf.dividendYield,
      latestDistribution: etf.latestDividend,
      ttmDistributionAmount: Number(ttmDistributionAmount.toFixed(4)),
      frequency: etf.dividendFrequency,
      nextExDate: { date: "2026-08-20", confirmed: false },
      nextPayDate: { date: "2026-08-27", confirmed: false },
      history,
      distributionCagr3y: calculateCagr(firstHistory, lastHistory, 3),
      distributionCagr5y: etf.market === "KRX" ? null : calculateCagr(firstHistory * 0.92, lastHistory, 5),
      annualIncreaseYears: etf.category.includes("배당 성장") ? 5 + (index % 6) : null,
    },
    performance: makePerformance(etf, index),
    risk,
    cost: {
      expenseRatio: etf.expenseRatio,
      annualCost: {
        oneMillion: calculateAnnualCost(1000000, etf.expenseRatio),
        tenMillion: calculateAnnualCost(10000000, etf.expenseRatio),
        hundredMillion: calculateAnnualCost(100000000, etf.expenseRatio),
      },
    },
    topHoldings: makeHoldings(etf),
    sectorAllocations: etf.sectors.map(([label, weight]) => ({ label, weight })),
    countryAllocations: listingRegion === "domestic" ? [{ label: "미국", weight: 92 }, { label: "한국 상장", weight: 8 }] : [{ label: "미국", weight: 96 }, { label: "기타", weight: 4 }],
    top10Concentration: Number(makeHoldings(etf).reduce((sum, holding) => sum + holding.weight, 0).toFixed(2)),
    holdingsAsOf: DATA_AS_OF,
    metadata,
  };
};

export const MOCK_ETFS = etfs.map(enhanceEtf);

const bySlugOrTicker = (ticker) => MOCK_ETFS.find((etf) => etf.slug === ticker?.toLowerCase() || etf.ticker.toLowerCase() === ticker?.toLowerCase());

const withResponse = async (data, meta = makeMetadata(data?.currency || "USD")) => {
  await sleep();
  return { data, meta };
};

export const etfMockApi = {
  async searchEtfs({ keyword = "", filters = {}, page = 1, size = 12, sort = "distribution-desc" } = {}) {
    const filtered = filterEtfs(MOCK_ETFS, { keyword, ...filters });
    const sorted = sortEtfs(filtered, sort);
    const { items, pagination } = paginate(sorted, page, size);
    await sleep();
    return {
      data: items,
      pagination,
      meta: makeMetadata("MIXED"),
    };
  },

  async getEtf(ticker) {
    const etf = bySlugOrTicker(ticker);
    if (!etf) throw new Error("ETF 정보를 찾을 수 없습니다.");
    return withResponse(etf, etf.metadata);
  },

  async getPerformance(ticker) {
    const etf = bySlugOrTicker(ticker);
    if (!etf) throw new Error("성과 정보를 찾을 수 없습니다.");
    return withResponse(etf.performance, etf.metadata);
  },

  async getDistributions(ticker) {
    const etf = bySlugOrTicker(ticker);
    if (!etf) throw new Error("분배금 정보를 찾을 수 없습니다.");
    return withResponse(etf.distribution, etf.metadata);
  },

  async getHoldings(ticker) {
    const etf = bySlugOrTicker(ticker);
    if (!etf) throw new Error("구성 종목 정보를 찾을 수 없습니다.");
    return withResponse({
      holdings: etf.topHoldings,
      sectors: etf.sectorAllocations,
      countries: etf.countryAllocations,
      top10Concentration: etf.top10Concentration,
      asOf: etf.holdingsAsOf,
    }, etf.metadata);
  },

  async getSimilar(ticker) {
    const etf = bySlugOrTicker(ticker);
    if (!etf) throw new Error("유사 ETF 정보를 찾을 수 없습니다.");
    const similar = etf.similar.map(bySlugOrTicker).filter(Boolean).slice(0, 5);
    return withResponse(similar, etf.metadata);
  },

  async compareEtfs(tickers = []) {
    const selected = tickers.map(bySlugOrTicker).filter(Boolean).slice(0, 4);
    if (!selected.length) throw new Error("비교할 ETF를 선택해주세요.");
    return withResponse(selected, makeMetadata("MIXED"));
  },

  async getComparisonPreset(slug) {
    const comparison = getComparison(slug);
    if (!comparison) throw new Error("비교 페이지를 찾을 수 없습니다.");
    const selected = comparison.etfSlugs.map(bySlugOrTicker).filter(Boolean);
    return withResponse({ ...comparison, etfs: selected }, makeMetadata("MIXED"));
  },

  async getRanking(kind, filters = {}) {
    const ranking = rankingPages.find((item) => item.slug === kind);
    if (!ranking) throw new Error("순위 정보를 찾을 수 없습니다.");
    const items = ranking.etfSlugs.map(bySlugOrTicker).filter(Boolean);
    const filtered = filterEtfs(items, { region: filters.region || "all", assetType: filters.assetType || "all" });
    const sorted = sortEtfs(filtered, kind === "dividend-growth" ? "return1y-desc" : "distribution-desc");
    return withResponse({ ranking, items: sorted }, makeMetadata("MIXED"));
  },

  async getHubSummary() {
    const highDividend = sortEtfs(MOCK_ETFS, "distribution-desc").slice(0, 5);
    const monthly = sortEtfs(MOCK_ETFS.filter((etf) => etf.distribution.frequency === "월"), "distribution-desc").slice(0, 5);
    const growth = sortEtfs(MOCK_ETFS.filter((etf) => etf.objectives.includes("distribution-growth")), "return1y-desc").slice(0, 5);
    return withResponse({
      popularKeywords: ["SCHD", "JEPI", "월배당", "커버드콜", "국내 월배당", "S&P 500"],
      typeShortcuts: ["시장대표", "고배당", "배당성장", "월배당", "커버드콜", "채권", "리츠", "섹터", "테마"],
      mostViewed: MOCK_ETFS.slice(0, 6),
      highDividend,
      monthly,
      growth,
    }, makeMetadata("MIXED"));
  },
};
