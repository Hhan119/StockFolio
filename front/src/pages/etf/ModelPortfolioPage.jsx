import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Seo from "../../components/Seo.jsx";
import { ErrorState, InvestmentDisclaimer, SkeletonState } from "../../components/etf/index.jsx";
import { etfMarketService } from "../../services/etfMarketService.js";

const riskOptions = [["STABLE", "안정형"], ["BALANCED", "균형형"], ["AGGRESSIVE", "공격형"]];
const objectiveOptions = [
  ["LONG_TERM_GROWTH", "장기 성장"],
  ["RETIREMENT_INCOME", "은퇴 인컴"],
  ["DIVIDEND_GROWTH", "배당 성장"],
  ["CAPITAL_PRESERVATION", "자산 보전"],
];

function ModelPortfolioPage() {
  const [riskLevel, setRiskLevel] = useState("BALANCED");
  const [objective, setObjective] = useState("LONG_TERM_GROWTH");
  const query = useQuery({
    queryKey: ["model-portfolio", riskLevel, objective],
    queryFn: () => etfMarketService.simulateModelPortfolio({ riskLevel, objective }),
    staleTime: 24 * 60 * 60_000,
    retry: false,
  });

  return (
    <section className="grid gap-5">
      <Seo title="ETF 모델 포트폴리오" description="위험성향과 투자 목적별 교육용 ETF 자산배분 예시를 확인합니다." path="/etf/model-portfolios" />

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Educational Allocation</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">ETF 모델 포트폴리오</h2>
        <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">개별 ETF를 자동 추천하지 않고 자산군별 목표 비중과 검토 가능한 후보를 제시합니다.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <OptionGroup label="위험성향" options={riskOptions} value={riskLevel} onChange={setRiskLevel} />
          <OptionGroup label="투자 목적" options={objectiveOptions} value={objective} onChange={setObjective} />
        </div>
      </header>

      {query.isLoading && <SkeletonState rows={5} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {query.data && <PortfolioResult data={query.data} />}
      <InvestmentDisclaimer />
    </section>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-black text-slate-500">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {options.map(([key, text]) => (
          <button className={`min-h-11 rounded-xl px-4 text-sm font-black transition ${value === key ? "bg-cyan-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`} key={key} type="button" onClick={() => onChange(key)}>{text}</button>
        ))}
      </div>
    </fieldset>
  );
}

function PortfolioResult({ data }) {
  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Target Allocation</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{data.title}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.allocations.map((allocation) => <AllocationCard allocation={allocation} key={allocation.assetClass} />)}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-black text-slate-950 dark:text-white">목표 비중</h3>
          <div className="mt-4 grid gap-3">
            {data.allocations.map((allocation) => (
              <div key={allocation.assetClass}>
                <div className="flex justify-between text-sm font-black text-slate-700 dark:text-slate-200"><span>{allocation.label}</span><span>{allocation.targetWeight}%</span></div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-3 rounded-full bg-cyan-600" style={{ width: `${allocation.targetWeight}%` }} /></div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-3">
        <RuleList title="편입 제한" items={data.constraints} />
        <RuleList title="리밸런싱" items={data.rebalanceRules} />
        <RuleList title="확인 사항" items={data.notices} />
      </section>
    </>
  );
}

function AllocationCard({ allocation }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black text-slate-500">{allocation.assetClass}</p><h4 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{allocation.label}</h4></div>
        <span className="rounded-xl bg-cyan-600 px-3 py-2 font-black text-white">{allocation.targetWeight}%</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{allocation.reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">{allocation.candidateTickers.map((ticker) => <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200" key={ticker}>{ticker}</span>)}</div>
    </article>
  );
}

function RuleList({ title, items }) {
  return <article className="bg-white p-5 dark:bg-slate-900"><h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3><ul className="mt-3 grid gap-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{items.map((item) => <li className="border-l-2 border-cyan-500 pl-3" key={item}>{item}</li>)}</ul></article>;
}

export default ModelPortfolioPage;
