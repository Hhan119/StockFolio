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

function MonthlyDividendCalendar() {
  const token = useAuthStore((state) => state.token);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [summary, setSummary] = useState(null);

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

  const monthly = summary?.monthly || publicMonthly;
  const annualEstimated = useMemo(
    () => monthly.reduce((sum, item) => sum + Number(item.estimatedTotal || 0), 0),
    [monthly],
  );
  const monthlyAverage = annualEstimated / 12;
  const dividendStockCount = summary?.dividendStockCount || "-";

  return (
    <section>
      <PageHeader
        eyebrow="포트폴리오"
        title="월 배당 캘린더"
        description="보유종목의 주당 배당금과 수량을 기준으로 월별 예상 배당금을 확인합니다."
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
        {monthly.map((item) => (
          <article className="metric-card" key={item.month}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-500">{item.month}월</p>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{item.dividendCount}건</span>
            </div>
            <strong className="mt-2 block text-2xl font-black">{formatMoney(item.estimatedTotal)}</strong>
            <div className="mt-3 grid gap-1 text-xs font-bold text-slate-500">
              {(item.items || []).slice(0, 3).map((dividend) => (
                <p className="flex justify-between gap-3" key={dividend.id}>
                  <span className="min-w-0 truncate">{dividend.stockName || dividend.name || dividend.stock?.name || dividend.stockTicker}</span>
                  <span>{formatMoney(dividend.totalDividend)}</span>
                </p>
              ))}
              {!(item.items || []).length && <p>{token ? "등록된 배당이 없습니다." : "예시 데이터입니다."}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default MonthlyDividendCalendar;
