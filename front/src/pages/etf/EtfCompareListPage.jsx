import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import { comparisonMatchesMarketFilter, comparisons, getComparisonEtfs, isDomesticEtf } from "../../data/publicContent.js";

function EtfCompareListPage() {
  const [marketFilter, setMarketFilter] = useState("all");

  const counts = useMemo(
    () => ({
      all: comparisons.length,
      domestic: comparisons.filter((comparison) => comparisonMatchesMarketFilter(comparison, "domestic")).length,
      overseas: comparisons.filter((comparison) => comparisonMatchesMarketFilter(comparison, "overseas")).length,
    }),
    [],
  );

  const filteredComparisons = useMemo(
    () => comparisons.filter((comparison) => comparisonMatchesMarketFilter(comparison, marketFilter)),
    [marketFilter],
  );

  return (
    <section className="grid gap-5">
      <Seo title="ETF 비교" description="SCHD vs JEPI, VOO vs QQQM 등 대표 ETF 비교 페이지를 제공합니다." path="/etf/compare" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700">ETF Compare</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">ETF 비교</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">국내 상장 ETF 비교와 해외 ETF 비교를 나눠 볼 수 있습니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={marketFilter} onChange={setMarketFilter} />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {filteredComparisons.map((comparison) => {
          const comparisonEtfs = getComparisonEtfs(comparison);
          const domestic = comparisonEtfs.every(isDomesticEtf);
          return (
            <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md" key={comparison.slug} to={`/etf/compare/${comparison.slug}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-xl font-black text-slate-950">{comparison.title}</h3>
                <span className={["shrink-0 rounded-xl px-3 py-1 text-xs font-black", domestic ? "bg-emerald-50 text-emerald-700" : "bg-cyan-50 text-cyan-700"].join(" ")}>
                  {domestic ? "국내" : "해외"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{comparison.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparisonEtfs.map((etf) => (
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700" key={etf.slug}>{etf.ticker}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
      {filteredComparisons.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">비교 페이지가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-slate-500">선택한 시장 구분에 맞는 ETF 비교 콘텐츠를 준비 중입니다.</p>
        </div>
      )}
    </section>
  );
}

export default EtfCompareListPage;
