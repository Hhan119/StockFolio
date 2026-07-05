import { Link } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { comparisons } from "../../data/publicContent.js";

function EtfCompareListPage() {
  return (
    <section className="grid gap-5">
      <Seo title="ETF 비교" description="SCHD vs JEPI, VOO vs QQQM 등 대표 ETF 비교 페이지를 제공합니다." path="/etf/compare" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-700">ETF Compare</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">ETF 비교</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">단순 배당률보다 수수료, 배당 주기, 성장성, 투자 목적 적합성을 함께 비교합니다.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {comparisons.map((comparison) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md" key={comparison.slug} to={`/etf/compare/${comparison.slug}`}>
            <h3 className="text-xl font-black text-slate-950">{comparison.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{comparison.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default EtfCompareListPage;
