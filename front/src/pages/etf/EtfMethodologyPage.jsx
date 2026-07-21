import { useQuery } from "@tanstack/react-query";
import Seo from "../../components/Seo.jsx";
import { ErrorState, InvestmentDisclaimer, SkeletonState } from "../../components/etf/index.jsx";
import { etfMarketService } from "../../services/etfMarketService.js";

const sectionLabels = {
  classificationRules: "분류 체계",
  scoringRules: "점수 계산",
  dataQualityRules: "데이터 품질",
  sourcePriority: "데이터 소스 우선순위",
  limitations: "한계와 주의사항",
};

function EtfMethodologyPage() {
  const query = useQuery({
    queryKey: ["etf-methodology"],
    queryFn: () => etfMarketService.getMethodology(),
    staleTime: 24 * 60 * 60_000,
    retry: false,
  });

  return (
    <section className="grid gap-5">
      <Seo title="ETF 데이터·랭킹 방법론" description="StockFolio ETF 분류, 점수, 데이터 품질, 소스 우선순위를 공개합니다." path="/etf/methodology" />

      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Open Methodology</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">ETF 데이터·랭킹 방법론</h2>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
          검색, 상세, 비교, 랭킹, 분석이 같은 분류와 계산 규칙을 사용합니다. 제공되지 않은 위험 지표를 임의 생성하지 않고 데이터 품질에 반영합니다.
        </p>
      </header>

      {query.isLoading && <SkeletonState rows={5} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {query.data && <MethodologyContent data={query.data} />}
      <InvestmentDisclaimer />
    </section>
  );
}

function MethodologyContent({ data }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-black">
        <span className="rounded-lg bg-cyan-600 px-3 py-2 text-white">버전 {data.version}</span>
        <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">업데이트 {String(data.updatedAt).slice(0, 10)}</span>
      </div>

      <section className="grid gap-3">
        <h3 className="text-xl font-black text-slate-950 dark:text-white">랭킹별 가중치</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {Object.entries(data.rankingWeights || {}).map(([kind, weights]) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={kind}>
              <h4 className="font-black text-slate-950 dark:text-white">{kindLabel(kind)}</h4>
              <div className="mt-4 grid gap-2">
                {Object.entries(weights).map(([metric, weight]) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_48px] items-center gap-3" key={metric}>
                    <div>
                      <div className="flex justify-between text-xs font-black text-slate-600 dark:text-slate-300"><span>{metricLabel(metric)}</span><span>{weight}%</span></div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-cyan-600" style={{ width: `${weight * 4}%` }} /></div>
                    </div>
                    <span className="text-right text-sm font-black text-slate-950 dark:text-white">{weight}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 lg:grid-cols-2">
        {Object.keys(sectionLabels).map((key) => (
          <article className="bg-white p-5 dark:bg-slate-900" key={key}>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{sectionLabels[key]}</h3>
            <ul className="mt-3 grid gap-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
              {(data[key] || []).map((item) => <li className="border-l-2 border-cyan-500 pl-3" key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}

const kindLabel = (value) => ({
  "high-dividend": "고배당", "monthly-dividend": "월분배", "dividend-growth": "배당 성장",
  "covered-call": "커버드콜", "korea-listed-monthly": "국내 상장 월분배",
}[value] || value);

const metricLabel = (value) => ({
  distributionYield: "TTM 분배율", distributionStability: "분배 안정성", paymentRegularity: "지급 규칙성",
  distributionVolatility: "분배 변동성", distributionGrowth3y: "3년 분배 성장", distributionGrowth5y: "5년 분배 성장",
  distributionContinuity: "연속 성장", return3y: "3년 성과", return5y: "5년 성과",
  drawdown: "위험", cost: "비용", liquidity: "유동성",
}[value] || value);

export default EtfMethodologyPage;
