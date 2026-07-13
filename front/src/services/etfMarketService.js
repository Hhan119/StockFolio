import { MOCK_ETFS } from "./etfMockApi.js";
import { api } from "./api.js";
import { calculateAnnualCost } from "../utils/etfCalculations.js";

const snapshotPromises = new Map();

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const positiveNumber = (value) => {
  const number = asNumber(value);
  return number !== null && number > 0 ? number : null;
};

const marketForTicker = (ticker) => (/^\d{5}[0-9A-Z]$/i.test(String(ticker || "")) ? "KR" : "US");
const eventDate = (event) => event.paymentDate || event.exDividendDate;

const observedFrequency = (events = []) => {
  const recent = events.filter((event) => {
    const date = eventDate(event);
    if (!date) return false;
    const elapsed = Date.now() - new Date(date).getTime();
    return elapsed >= 0 && elapsed <= 370 * 24 * 60 * 60 * 1000;
  });
  if (recent.length >= 10) return "월";
  if (recent.length >= 3) return "분기";
  if (recent.length === 2) return "반기";
  if (recent.length === 1) return "연";
  return "정보 없음";
};

const nextDate = (date, frequency) => {
  if (!date || frequency === "정보 없음") return null;
  const months = { 월: 1, 분기: 3, 반기: 6, 연: 12 }[frequency];
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
};

const distributionModel = (snapshot) => {
  const profile = snapshot.etfProfile || {};
  const events = [...(snapshot.dividends || [])]
    .filter((event) => positiveNumber(event.amountPerShare))
    .sort((left, right) => String(eventDate(left)).localeCompare(String(eventDate(right))));
  const frequency = observedFrequency(events);
  const latest = events.at(-1);
  const lastYearEvents = events.filter((event) => {
    const date = eventDate(event);
    if (!date) return false;
    const elapsed = Date.now() - new Date(date).getTime();
    return elapsed >= 0 && elapsed <= 370 * 24 * 60 * 60 * 1000;
  });
  const observedTtmAmount = lastYearEvents.reduce((sum, event) => sum + Number(event.amountPerShare || 0), 0);
  const ttmAmount = observedTtmAmount > 0 ? observedTtmAmount : positiveNumber(profile.dividendPerShareTtm);
  const currentPrice = positiveNumber(snapshot.quote?.currentPrice);
  const nextPayment = nextDate(eventDate(latest), frequency);

  return {
    ttmDistributionRate: positiveNumber(profile.dividendYieldTtm)
      || (currentPrice && ttmAmount ? (ttmAmount / currentPrice) * 100 : positiveNumber(snapshot.quote?.dividendYield)),
    latestDistribution: positiveNumber(latest?.amountPerShare),
    ttmDistributionAmount: ttmAmount || null,
    frequency,
    nextExDate: { date: nextPayment, confirmed: false },
    nextPayDate: { date: nextPayment, confirmed: false },
    history: lastYearEvents.map((event) => ({
      date: eventDate(event),
      amount: Number(event.amountPerShare),
      confirmed: !String(event.source || "").includes("estimate"),
      source: event.source,
    })),
    distributionCagr3y: null,
    distributionCagr5y: null,
    annualIncreaseYears: null,
  };
};

const emptyPerformance = () => ({
  totalReturn: { oneMonth: null, threeMonth: null, oneYear: null, threeYear: null, fiveYear: null },
  priceReturn: { oneMonth: null, threeMonth: null, oneYear: null, threeYear: null, fiveYear: null },
  distributionReturn: { oneYear: null, threeYear: null, fiveYear: null },
  series: [],
});

const performanceModel = (profile = {}) => ({
  ...emptyPerformance(),
  totalReturn: {
    oneMonth: asNumber(profile.returnOneMonth),
    threeMonth: asNumber(profile.returnThreeMonth),
    oneYear: asNumber(profile.returnOneYear),
    threeYear: asNumber(profile.returnThreeYear),
    fiveYear: asNumber(profile.returnFiveYear),
  },
});

const editorialFor = (ticker) => MOCK_ETFS.find((item) => item.ticker.toUpperCase() === String(ticker).toUpperCase());

const inferObjectives = (name, distribution) => {
  const text = String(name || "").toUpperCase();
  const values = ["장기 투자"];
  if (distribution.frequency !== "정보 없음") values.push("현금 흐름");
  if (text.includes("커버드콜") || text.includes("COVERED CALL")) values.push("월 분배 전략");
  if (text.includes("채권") || text.includes("BOND")) values.push("채권 분산");
  return values;
};

const toRichEtf = (snapshot) => {
  const profile = snapshot.etfProfile || {};
  const quote = snapshot.quote || {};
  const editorial = editorialFor(snapshot.ticker);
  const distribution = distributionModel(snapshot);
  const expenseRatio = positiveNumber(profile.expenseRatio);
  const holdings = (snapshot.holdings || []).map((holding) => ({
    ticker: holding.ticker || "-",
    name: holding.name || holding.ticker || "기타 자산",
    weight: positiveNumber(holding.weight),
    shares: positiveNumber(holding.shares),
    marketValue: positiveNumber(holding.marketValue),
    source: holding.source,
  }));
  const top10Concentration = holdings.slice(0, 10).reduce((sum, holding) => sum + Number(holding.weight || 0), 0) || null;
  const listingRegion = snapshot.market === "KR" ? "domestic" : "overseas";
  const currentPrice = positiveNumber(quote.currentPrice);
  const changeRate = asNumber(quote.changeRate);
  const metadata = {
    asOf: snapshot.asOf,
    source: (snapshot.sources || []).join(" · ") || "공급자 정보 없음",
    delayed: true,
    mock: false,
    currency: quote.currency || profile.currency || (snapshot.market === "KR" ? "KRW" : "USD"),
  };

  return {
    slug: snapshot.ticker.toLowerCase(),
    ticker: snapshot.ticker,
    name: snapshot.name,
    provider: profile.provider || "운용사 정보 없음",
    market: snapshot.market === "KR" ? "KRX" : profile.exchange || "US",
    currency: metadata.currency,
    listingRegion,
    regionLabel: listingRegion === "domestic" ? "국내" : "해외",
    category: profile.assetClass || "ETF",
    assetType: profile.assetClass === "채권" ? "bond" : profile.assetClass === "리츠/부동산" ? "reit" : "equity",
    objectives: editorial?.objectives || inferObjectives(snapshot.name, distribution),
    managementStyle: editorial?.managementStyle || "정보 없음",
    indexName: profile.indexName || editorial?.indexName || "정보 없음",
    strategy: profile.description || editorial?.strategy || `${snapshot.name}의 공시된 상품 정보를 기준으로 확인합니다.`,
    beginnerDescription: profile.description || editorial?.beginnerDescription || `${snapshot.name}의 가격, 분배금, 구성종목을 공급자 기준일에 맞춰 제공합니다.`,
    summary: editorial?.summary || {},
    pros: editorial?.pros || ["한 종목으로 여러 자산에 분산 투자할 수 있습니다."],
    cons: editorial?.cons || ["가격, 분배금, 구성 비중은 시장 상황과 운용 정책에 따라 달라질 수 있습니다."],
    aum: positiveNumber(profile.aum),
    quote: {
      currentPrice,
      change: currentPrice && quote.previousClose ? currentPrice - Number(quote.previousClose) : null,
      changeRate,
      currency: metadata.currency,
      metadata,
    },
    distribution,
    performance: performanceModel(profile),
    risk: {
      volatility: null,
      maxDrawdown: null,
      beta: null,
      standardDeviation: null,
      trackingError: null,
      premiumDiscount: profile.nav && currentPrice ? ((currentPrice - Number(profile.nav)) / Number(profile.nav)) * 100 : null,
      averageVolume: null,
      bidAskSpread: null,
      badges: [],
    },
    cost: {
      expenseRatio,
      annualCost: {
        oneMillion: expenseRatio === null ? null : calculateAnnualCost(1_000_000, expenseRatio),
        tenMillion: expenseRatio === null ? null : calculateAnnualCost(10_000_000, expenseRatio),
        hundredMillion: expenseRatio === null ? null : calculateAnnualCost(100_000_000, expenseRatio),
      },
    },
    topHoldings: holdings,
    sectorAllocations: [],
    countryAllocations: [],
    top10Concentration,
    holdingsAsOf: snapshot.asOf,
    financials: snapshot.financials || [],
    metadata,
  };
};

const loadSnapshot = (ticker, market = marketForTicker(ticker)) => {
  const normalizedTicker = String(ticker || "").trim().toUpperCase();
  const key = `${market}:${normalizedTicker}`;
  if (!snapshotPromises.has(key)) {
    const request = api.get(`/api/market/instruments/${encodeURIComponent(normalizedTicker)}`, { params: { market } })
      .then((response) => response.data)
      .finally(() => window.setTimeout(() => snapshotPromises.delete(key), 5 * 60 * 1000));
    snapshotPromises.set(key, request);
  }
  return snapshotPromises.get(key);
};

export const etfMarketService = {
  searchEtfs(keyword, market = "ALL", limit = 60) {
    return api.get("/api/market/etfs/search", { params: { keyword, market, limit } }).then((response) => response.data);
  },

  async getEtf(ticker, market = marketForTicker(ticker)) {
    const snapshot = await loadSnapshot(ticker, market);
    if (!snapshot?.etf) throw new Error("ETF 정보를 찾지 못했습니다.");
    const data = toRichEtf(snapshot);
    return { data, meta: data.metadata };
  },

  async compareEtfs(tickers = []) {
    const settled = await Promise.allSettled(tickers.slice(0, 4).map((ticker) => this.getEtf(ticker)));
    const data = settled.filter((result) => result.status === "fulfilled").map((result) => result.value.data);
    if (!data.length) throw new Error("비교할 ETF 정보를 불러오지 못했습니다.");
    return { data, meta: { asOf: new Date().toISOString(), source: "시장 데이터 API", mock: false } };
  },
};

export const toEtfSuggestion = (item) => ({
  ...item,
  slug: String(item.ticker || "").toLowerCase(),
  currentPrice: positiveNumber(item.currentPrice),
  listingRegion: item.market === "KR" ? "domestic" : "overseas",
  regionLabel: item.market === "KR" ? "국내" : "해외",
});
