const normalizeCurrency = (currency = "KRW") => String(currency || "KRW").toUpperCase();

const formatAmount = (value, currency) => Number(value || 0).toLocaleString("ko-KR", {
  maximumFractionDigits: currency === "KRW" ? 0 : 2,
});

export const formatMoney = (value, currency = "KRW") => {
  const normalizedCurrency = normalizeCurrency(currency);
  const amount = formatAmount(value, normalizedCurrency);

  if (normalizedCurrency === "USD") return `$${amount}`;
  if (normalizedCurrency === "KRW") return `${amount}원`;
  return `${amount} ${normalizedCurrency}`;
};

export const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
