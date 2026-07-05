import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { getComparison, getEtf } from "../../data/publicContent.js";
import { formatPercent } from "../../utils/format.js";

function EtfComparePage() {
  const { slug } = useParams();
  const comparison = getComparison(slug);
  if (!comparison) return <Navigate to="/404" replace />;

  const [left, right] = comparison.etfSlugs.map(getEtf);
  if (!left || !right) return <Navigate to="/404" replace />;

  const rows = [
    ["운용사", left.provider, right.provider],
    ["상장 시장", left.market, right.market],
    ["수수료", formatPercent(left.expenseRatio), formatPercent(right.expenseRatio)],
    ["배당률", formatPercent(left.dividendYield), formatPercent(right.dividendYield)],
    ["배당 주기", left.dividendFrequency, right.dividendFrequency],
    ["성격", left.category, right.category],
  ];

  return (
    <article className="grid gap-5">
      <Seo title={comparison.title} description={comparison.summary} path={`/etf/compare/${comparison.slug}`} />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">ETF Compare</p>
        <h2 className="mt-2 text-4xl font-black">{comparison.title}</h2>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">{comparison.summary}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr><th className="p-4">항목</th><th className="p-4">{left.ticker}</th><th className="p-4">{right.ticker}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, a, b]) => (
              <tr key={label}><td className="p-4 font-black text-slate-700">{label}</td><td className="p-4 font-bold">{a}</td><td className="p-4 font-bold">{b}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[left, right].map((etf) => (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={etf.slug}>
            <h3 className="text-2xl font-black text-slate-950">{etf.ticker} 해석</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{etf.summary}</p>
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">
              적합 투자자: {etf.suitableFor}
            </p>
            <Link className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white" to={`/etf/${etf.slug}`}>{etf.ticker} 상세 보기</Link>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-2xl font-black text-slate-950">결론</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          {left.ticker}와 {right.ticker} 중 어느 쪽이 더 낫다고 단정하기보다, 투자 목적을 먼저 정해야 합니다.
          월 현금흐름, 장기 성장, 비용, 변동성, 세금, 환율을 함께 고려해야 하며 특정 ETF 매수 추천으로 해석해서는 안 됩니다.
        </p>
      </section>
    </article>
  );
}

export default EtfComparePage;
