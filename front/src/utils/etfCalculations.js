export const NA = "N/A";

export const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const formatNullable = (value, formatter) => {
  const number = toNumberOrNull(value);
  return number === null ? NA : formatter(number);
};

export const calculateCagr = (startValue, endValue, years) => {
  const start = toNumberOrNull(startValue);
  const end = toNumberOrNull(endValue);
  const period = toNumberOrNull(years);
  if (!start || !end || !period || start <= 0 || end <= 0 || period <= 0) return null;
  return (Math.pow(end / start, 1 / period) - 1) * 100;
};

export const calculateAnnualCost = (investmentAmount, expenseRatio) => {
  const amount = toNumberOrNull(investmentAmount);
  const ratio = toNumberOrNull(expenseRatio);
  if (amount === null || ratio === null) return null;
  return amount * (ratio / 100);
};

export const clampCompareItems = (items, maxItems) => items.slice(0, maxItems);

export const getListingRegion = (etf) => (etf?.market === "KRX" || etf?.currency === "KRW" ? "domestic" : "overseas");

export const filterEtfs = (items, { keyword = "", region = "all", assetType = "all", objective = "all", frequency = "all", management = "all" } = {}) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  return items.filter((etf) => {
    const haystack = [etf.ticker, etf.name, etf.provider, etf.market, etf.category, etf.indexName, etf.strategy].join(" ").toLowerCase();
    const matchesKeyword = !normalizedKeyword || haystack.includes(normalizedKeyword);
    const matchesRegion = region === "all" || etf.listingRegion === region;
    const matchesAsset = assetType === "all" || etf.assetType === assetType;
    const matchesObjective = objective === "all" || etf.objectives.includes(objective);
    const matchesFrequency = frequency === "all" || etf.distribution.frequency === frequency;
    const matchesManagement = management === "all" || etf.managementStyle === management;
    return matchesKeyword && matchesRegion && matchesAsset && matchesObjective && matchesFrequency && matchesManagement;
  });
};

export const sortEtfs = (items, sort = "distribution-desc") => {
  const sorted = [...items];
  const direction = sort.endsWith("asc") ? 1 : -1;
  const key = sort.replace(/-(asc|desc)$/, "");
  const getValue = (etf) => {
    if (key === "distribution") return etf.distribution.ttmDistributionRate;
    if (key === "return1y") return etf.performance.totalReturn.oneYear;
    if (key === "expense") return etf.cost.expenseRatio;
    if (key === "aum") return etf.aum;
    return etf.ticker;
  };
  sorted.sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === "string") return av.localeCompare(bv) * direction;
    return (av - bv) * direction;
  });
  return sorted;
};

export const paginate = (items, page = 1, size = 12) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeSize = Math.max(Number(size) || 12, 1);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    pagination: {
      page: safePage,
      size: safeSize,
      totalItems: items.length,
      totalPages: Math.max(Math.ceil(items.length / safeSize), 1),
    },
  };
};

export const getPerformanceTone = (value) => {
  const number = toNumberOrNull(value);
  if (number === null || number === 0) return "neutral";
  return number > 0 ? "positive" : "negative";
};
