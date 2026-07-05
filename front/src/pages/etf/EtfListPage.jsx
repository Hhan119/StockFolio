import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, etfs, isDomesticEtf, matchesMarketFilter } from "../../data/publicContent.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

function EtfListPage() {
  const [marketFilter, setMarketFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const counts = useMemo(
    () => ({
      all: etfs.length,
      domestic: etfs.filter(isDomesticEtf).length,
      overseas: etfs.filter((etf) => !isDomesticEtf(etf)).length,
    }),
    [],
  );

  const filteredEtfs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return etfs.filter((etf) => {
      const matchesMarket = matchesMarketFilter(etf, marketFilter);
      const matchesKeyword =
        !normalizedKeyword ||
        [etf.ticker, etf.name, etf.market, etf.provider, etf.category].some((value) => value.toLowerCase().includes(normalizedKeyword));
      return matchesMarket && matchesKeyword;
    });
  }, [keyword, marketFilter]);

  return (
    <section className="grid gap-5">
      <Seo title="ETF 검색과 상세 정보" description="배당 ETF, 월배당 ETF, 성장 ETF의 배당률, 분배 주기, 장단점을 확인합니다." path="/etf" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">ETF Directory</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">ETF 검색</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">데이터 기준일: {DATA_AS_OF}. 국내/해외 ETF를 나눠 보고, 티커·이름·운용사로 검색할 수 있습니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={marketFilter} onChange={setMarketFilter} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <input
            className="form-control"
            placeholder="티커, ETF 이름, 운용사 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className="text-sm font-black text-slate-500">검색 결과 {filteredEtfs.length}개</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredEtfs.map((etf) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={etf.slug} to={`/etf/${etf.slug}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950">{etf.ticker}</p>
                <h3 className="mt-1 font-black text-slate-800">{etf.name}</h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{etf.category}</span>
                <span className={["rounded-xl px-3 py-1 text-xs font-black", isDomesticEtf(etf) ? "bg-emerald-50 text-emerald-700" : "bg-cyan-50 text-cyan-700"].join(" ")}>
                  {isDomesticEtf(etf) ? "국내" : "해외"}
                </span>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{etf.summary}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">현재가</p>
                <p className="mt-1 font-black text-slate-950">{formatMoney(etf.price, etf.currency)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">배당률</p>
                <p className="mt-1 font-black text-emerald-700">{formatPercent(etf.dividendYield)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500">주기</p>
                <p className="mt-1 font-black text-slate-950">{etf.dividendFrequency}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filteredEtfs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">검색 결과가 없습니다</p>
          <p className="mt-2 text-sm font-bold text-slate-500">필터를 전체로 바꾸거나 다른 키워드로 검색해보세요.</p>
        </div>
      )}
    </section>
  );
}

export default EtfListPage;
