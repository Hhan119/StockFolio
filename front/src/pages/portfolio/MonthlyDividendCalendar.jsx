import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import { portfolioService } from "../../services/portfolioService.js";
import { useAuthStore } from "../../store/authStore.js";
import { formatMoney } from "../../utils/format.js";

const publicMonthly = Array.from({ length: 12 }, (_, index) => ({
  month: index + 1,
  estimatedTotal: [1, 4, 7, 10].includes(index + 1) ? 120000 : [3, 6, 9, 12].includes(index + 1) ? 180000 : 80000,
  dividendCount: [1, 4, 7, 10].includes(index + 1) ? 2 : 1,
  items: [],
}));

const frequencyLabels = {
  MONTHLY: "월배당",
  QUARTERLY: "분기배당",
  SEMI_ANNUAL: "반기배당",
  SEMIANNUAL: "반기배당",
  ANNUAL: "연배당",
  SPECIAL: "특별배당",
  IRREGULAR: "불규칙",
  NONE: "배당 없음",
  UNKNOWN: "정보 없음",
};

const eventStatusLabels = {
  ESTIMATED: "예상",
  DECLARED: "발표",
  CONFIRMED: "확정",
  PAID: "지급 완료",
  CORRECTED: "정정",
  CANCELLED: "취소",
};

const confidenceLabels = {
  HIGH: "신뢰도 높음",
  MEDIUM: "신뢰도 보통",
  LOW: "신뢰도 낮음",
  UNAVAILABLE: "신뢰도 없음",
};

const distributionTypeLabels = {
  REGULAR: "정기분배",
  SPECIAL: "특별분배",
  CAPITAL_GAIN: "자본이득",
  RETURN_OF_CAPITAL: "원금분배",
  INTEREST: "이자",
  OTHER: "기타",
};

function getDividendName(dividend) {
  return dividend.stockName || dividend.name || dividend.stock?.name || dividend.stockTicker || "종목명 없음";
}

function getDividendTicker(dividend) {
  return dividend.stockTicker || dividend.ticker || dividend.stock?.ticker || "";
}

function getDividendCurrency(dividend) {
  const ticker = String(getDividendTicker(dividend));
  return /^\d{5,6}[0-9A-Z]?$/i.test(ticker) ? "KRW" : "USD";
}

function formatDividendMoney(value, dividend) {
  return formatMoney(value, getDividendCurrency(dividend));
}

function formatFrequency(frequency) {
  return frequencyLabels[frequency] || "배당 정보 없음";
}

function formatStatus(status) {
  return eventStatusLabels[status] || "예상";
}

function MonthlyDividendCalendar() {
  const token = useAuthStore((state) => state.token);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    if (!token) return;
    portfolioService.list().then((data) => {
      setPortfolios(data);
      if (data.length) setSelectedPortfolioId(String(data[0].id));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !selectedPortfolioId) return;
    portfolioService.dividendSummary(selectedPortfolioId).then(setSummary).catch(() => setSummary(null));
  }, [token, selectedPortfolioId]);

  useEffect(() => {
    if (!selectedMonth) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedMonth(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedMonth]);

  const monthly = summary?.monthly || publicMonthly;
  const annualEstimated = useMemo(
    () => monthly.reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0),
    [monthly],
  );
  const monthlyAverage = annualEstimated / 12;
  const dividendStockCount = summary?.dividendStockCount || "-";
  const selectedMonthItems = selectedMonth?.items || [];

  return (
    <section>
      <PageHeader
        eyebrow="포트폴리오"
        title="월 배당 캘린더"
        description="보유 종목의 주당 배당금, 지급 주기, 보유 수량을 기준으로 월별 예상 배당금을 확인합니다."
        action={token && portfolios.length > 1 ? (
          <select className="form-control max-w-xs" value={selectedPortfolioId} onChange={(event) => setSelectedPortfolioId(event.target.value)}>
            {portfolios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        ) : null}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <StatCard label="예상 연 배당금" value={formatMoney(annualEstimated)} />
        <StatCard label="월 평균 배당금" value={formatMoney(monthlyAverage)} />
        <StatCard label="배당 종목 수" value={String(dividendStockCount)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {monthly.map((item) => {
          const items = item.items || [];
          const previewItems = items.slice(0, 3);
          const hiddenCount = Math.max(items.length - previewItems.length, 0);
          const hasItems = items.length > 0;

          return (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-900" key={item.month}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-500 dark:text-slate-400">{item.month}월</p>
                <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{items.length || item.dividendCount || 0}건</span>
              </div>
              <strong className="mt-2 block text-2xl font-black text-slate-950 dark:text-white">{formatMoney(item.estimatedTotal)}</strong>

              <div className="mt-3 grid min-h-24 gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                {previewItems.map((dividend) => (
                  <p className="flex justify-between gap-3" key={`${item.month}-${dividend.id || getDividendTicker(dividend)}`}>
                    <span className="min-w-0 truncate">{getDividendName(dividend)}</span>
                    <span className="shrink-0 text-slate-800 dark:text-slate-100">{formatDividendMoney(dividend.totalDividend, dividend)}</span>
                  </p>
                ))}
                {hiddenCount > 0 && <p className="text-cyan-700 dark:text-cyan-300">외 {hiddenCount}개 종목 더 있음</p>}
                {!hasItems && <p>{token ? "등록된 배당 일정이 없습니다." : "예시 데이터입니다."}</p>}
              </div>

              <button
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:bg-cyan-950 dark:hover:text-cyan-100"
                disabled={!hasItems}
                onClick={() => setSelectedMonth(item)}
                type="button"
              >
                상세 보기
              </button>
            </article>
          );
        })}
      </div>

      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={() => setSelectedMonth(null)}>
          <section
            aria-modal="true"
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Dividend Detail</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{selectedMonth.month}월 배당 상세</h3>
                <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                  총 {selectedMonthItems.length}개 종목 · 예상 {formatMoney(selectedMonth.estimatedTotal)}
                </p>
              </div>
              <button className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => setSelectedMonth(null)} type="button">
                닫기
              </button>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid gap-3">
                {selectedMonthItems.map((dividend) => (
                  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900" key={`${selectedMonth.month}-${dividend.id || getDividendTicker(dividend)}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-slate-950 dark:text-white">{getDividendName(dividend)}</p>
                        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                          {getDividendTicker(dividend)} · {formatFrequency(dividend.frequency)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{formatStatus(dividend.distributionEventStatus)}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{confidenceLabels[dividend.estimateConfidence] || "신뢰도 없음"}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{distributionTypeLabels[dividend.distributionType] || "정기분배"}</span>
                        </div>
                      </div>
                      <strong className="text-xl font-black text-cyan-700 dark:text-cyan-300">{formatDividendMoney(dividend.totalDividend, dividend)}</strong>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <DetailCell label="보유 수량" value={`${Number(dividend.stockQuantity || 0).toLocaleString("ko-KR")}주`} />
                      <DetailCell label="1회 주당 분배금" value={formatDividendMoney(dividend.dividendPerShare, dividend)} />
                      <DetailCell label="배당락일" value={dividend.exDividendDate || (dividend.isDateEstimated ? "예상" : "-")} />
                      <DetailCell label="지급 예정일" value={dividend.paymentDate || "-"} />
                      <DetailCell label="예상 방법" value={dividend.estimateMethod || "-"} />
                      <DetailCell label="데이터 출처" value={dividend.provider || "-"} />
                      <DetailCell label="데이터 기준" value={dividend.dataAsOf ? new Date(dividend.dataAsOf).toLocaleString("ko-KR") : "-"} />
                      <DetailCell label="세후 금액" value="세율 설정 후 계산 가능" />
                    </div>
                    {dividend.memo && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{dividend.memo}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function DetailCell({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-800">
      <p className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</p>
      <strong className="mt-1 block font-black text-slate-950 dark:text-white">{value}</strong>
    </div>
  );
}

export default MonthlyDividendCalendar;
