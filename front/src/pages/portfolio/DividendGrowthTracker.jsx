import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import { portfolioService } from "../../services/portfolioService.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const targetGrowthRate = 8;

function DividendGrowthTracker() {
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    portfolioService.list().then((data) => {
      setPortfolios(data);
      if (data.length) setSelectedPortfolioId(String(data[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPortfolioId) return;
    portfolioService.dividendSummary(selectedPortfolioId).then(setSummary).catch(() => setSummary(null));
  }, [selectedPortfolioId]);

  const annualDividend = Number(summary?.annualEstimated || 0);
  const nextYearGoal = annualDividend * (1 + targetGrowthRate / 100);
  const strongestMonth = useMemo(
    () => (summary?.monthly || []).reduce((best, item) => Number(item.estimatedTotal || 0) > Number(best.estimatedTotal || 0) ? item : best, { estimatedTotal: 0, month: "-" }),
    [summary?.monthly],
  );

  const rows = [
    { label: "현재 연 예상 배당", value: annualDividend, growth: 0 },
    { label: "1년 후 목표", value: nextYearGoal, growth: targetGrowthRate },
    { label: "3년 후 목표", value: annualDividend * Math.pow(1 + targetGrowthRate / 100, 3), growth: targetGrowthRate },
    { label: "5년 후 목표", value: annualDividend * Math.pow(1 + targetGrowthRate / 100, 5), growth: targetGrowthRate },
  ];

  return (
    <section>
      <PageHeader
        eyebrow="포트폴리오"
        title="배당 성장 추적기"
        description="현재 등록된 배당 정보를 기준으로 연간 배당 목표와 성장 경로를 점검합니다."
        action={portfolios.length > 1 ? (
          <select className="form-control max-w-xs" value={selectedPortfolioId} onChange={(event) => setSelectedPortfolioId(event.target.value)}>
            {portfolios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        ) : null}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <StatCard label="연 예상 배당" value={formatMoney(annualDividend)} />
        <StatCard label="월 평균 배당" value={formatMoney(annualDividend / 12)} />
        <StatCard label="목표 성장률" value={formatPercent(targetGrowthRate)} tone="positive" />
        <StatCard label="배당 집중월" value={strongestMonth.month === "-" ? "-" : `${strongestMonth.month}월`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="metric-card overflow-x-auto">
          <h3 className="mb-3 font-black">배당 성장 목표</h3>
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500"><th className="py-3">구분</th><th>예상 배당금</th><th>성장률 가정</th><th>상태</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b last:border-0" key={row.label}>
                  <td className="py-3 font-black">{row.label}</td>
                  <td>{formatMoney(row.value)}</td>
                  <td className="font-black text-emerald-700">{formatPercent(row.growth)}</td>
                  <td>{annualDividend > 0 ? "추적 중" : "배당 종목 등록 필요"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="grid content-start gap-3">
          <article className="metric-card">
            <h3 className="font-black">사용 방법</h3>
            <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
              <p>1. 내 포트폴리오에서 배당 종목을 등록합니다.</p>
              <p>2. 주당 배당금과 지급월을 입력하면 연 예상 배당이 자동 집계됩니다.</p>
              <p>3. 매년 배당금 목표를 비교해 추가 매수 또는 리밸런싱 기준으로 활용합니다.</p>
            </div>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 className="font-black text-slate-950">다음 액션</h3>
            <p className="mt-2 text-sm font-bold text-slate-600">
              배당이 특정 월에 몰려 있다면 월배당 ETF나 다른 지급월의 종목을 섞어 현금흐름을 분산해보세요.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}

export default DividendGrowthTracker;
