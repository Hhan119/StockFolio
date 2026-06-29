const currencyLabel = (currency = "") => {
  if (currency === "KRW") return "원";
  if (currency === "USD") return "달러";
  return currency;
};

export const formatMoney = (value, currency = "") => {
  const label = currencyLabel(currency);
  return `${Number(value || 0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${label ? ` ${label}` : ""}`;
};

export const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
