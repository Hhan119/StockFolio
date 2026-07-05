import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import {
  CompareTray,
  EmptyState,
  ErrorState,
  EtfResultCard,
  EtfResultTable,
  EtfSearchBox,
  SkeletonState,
} from "../../components/etf/index.jsx";
import { etfMockApi, MOCK_ETFS } from "../../services/etfMockApi.js";

const filterOptions = {
  region: [
    ["all", "전체"],
    ["domestic", "국내"],
    ["overseas", "해외"],
  ],
  assetType: [
    ["all", "자산 전체"],
    ["equity", "주식"],
    ["bond", "채권"],
    ["reit", "리츠"],
  ],
  objective: [
    ["all", "목적 전체"],
    ["income", "분배금"],
    ["distribution-growth", "분배금 성장"],
    ["growth", "성장"],
    ["monthly-cashflow", "월 현금흐름"],
  ],
  frequency: [
    ["all", "분배 주기 전체"],
    ["월", "월"],
    ["분기", "분기"],
    ["반기", "반기"],
  ],
  management: [
    ["all", "운용 방식 전체"],
    ["passive", "패시브"],
    ["active", "액티브"],
  ],
};

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function EtfListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [filters, setFilters] = useState({ region: "all", assetType: "all", objective: "all", frequency: "all", management: "all" });
  const [viewMode, setViewMode] = useState("card");
  const [compareItems, setCompareItems] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const debouncedKeyword = useDebouncedValue(keyword);

  const maxCompareItems = typeof window !== "undefined" && window.innerWidth < 768 ? 3 : 4;

  const counts = useMemo(
    () => ({
      all: MOCK_ETFS.length,
      domestic: MOCK_ETFS.filter((etf) => etf.listingRegion === "domestic").length,
      overseas: MOCK_ETFS.filter((etf) => etf.listingRegion === "overseas").length,
    }),
    [],
  );

  const suggestions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return [];
    return MOCK_ETFS.filter((etf) => [etf.ticker, etf.name, etf.provider, etf.indexName, etf.strategy].join(" ").toLowerCase().includes(normalized));
  }, [keyword]);

  const query = useQuery({
    queryKey: ["etf-search", debouncedKeyword, filters],
    queryFn: () => etfMockApi.searchEtfs({ keyword: debouncedKeyword, filters, size: 60 }),
  });

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const selectedChips = Object.entries(filters)
    .filter(([, value]) => value !== "all")
    .map(([key, value]) => filterOptions[key].find(([optionValue]) => optionValue === value)?.[1] || value);

  const toggleCompare = (etf) => {
    setCompareItems((current) => {
      if (current.some((item) => item.ticker === etf.ticker)) return current.filter((item) => item.ticker !== etf.ticker);
      if (current.length >= maxCompareItems) return current;
      return [...current, etf];
    });
  };

  const toggleWatch = (etf) => {
    setWatchlist((current) => (current.includes(etf.ticker) ? current.filter((ticker) => ticker !== etf.ticker) : [...current, etf.ticker]));
  };

  const syncKeyword = (nextKeyword) => {
    setKeyword(nextKeyword);
    setSearchParams(nextKeyword ? { keyword: nextKeyword } : {});
  };

  const items = query.data?.data || [];

  return (
    <section className="grid gap-5 pb-28 lg:pb-4">
      <Seo title="ETF 검색" description="상장 국가, 자산 유형, 투자 목적, 분배 주기, 총보수 등을 기준으로 ETF를 검색합니다." path="/etf/search" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">ETF Search</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">ETF 검색</h2>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">300ms debounce, 최근 검색어, 키보드 방향키/Enter 선택을 지원합니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={filters.region} onChange={(value) => updateFilter("region", value)} />
        </div>
        <div className="mt-5">
          <EtfSearchBox
            suggestions={suggestions}
            value={keyword}
            onChange={syncKeyword}
            onSubmit={syncKeyword}
            onSelect={(etf) => navigate(`/etf/${etf.slug}`)}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {["assetType", "objective", "frequency", "management"].map((key) => (
            <select className="form-control bg-slate-50 dark:bg-slate-800" key={key} value={filters[key]} onChange={(event) => updateFilter(key, event.target.value)}>
              {filterOptions[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {selectedChips.length ? selectedChips.map((chip) => <span className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700" key={chip}>{chip}</span>) : <span className="text-sm font-bold text-slate-500">선택된 필터 없음</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-500">검색 결과 {query.data?.pagination?.totalItems ?? 0}개</span>
            <button className={`rounded-xl px-3 py-2 text-xs font-black ${viewMode === "card" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`} type="button" onClick={() => setViewMode("card")}>카드</button>
            <button className={`rounded-xl px-3 py-2 text-xs font-black ${viewMode === "table" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`} type="button" onClick={() => setViewMode("table")}>테이블</button>
          </div>
        </div>
      </div>

      {query.isLoading && <SkeletonState rows={4} />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {!query.isLoading && !query.isError && items.length === 0 && <EmptyState title="검색 결과가 없습니다" description="검색어 또는 필터 조건을 조정해보세요." />}
      {!query.isLoading && !query.isError && items.length > 0 && (
        <>
          {viewMode === "table" && <EtfResultTable items={items} keyword={debouncedKeyword} compareItems={compareItems} onToggleCompare={toggleCompare} />}
          <div className={viewMode === "table" ? "grid gap-3 lg:hidden" : "grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"}>
            {items.map((etf) => (
              <EtfResultCard
                compareSelected={compareItems.some((item) => item.ticker === etf.ticker)}
                etf={etf}
                key={etf.slug}
                keyword={debouncedKeyword}
                onToggleCompare={toggleCompare}
                onToggleWatch={toggleWatch}
                watchSelected={watchlist.includes(etf.ticker)}
              />
            ))}
          </div>
        </>
      )}

      <CompareTray items={compareItems} maxItems={maxCompareItems} onClear={() => setCompareItems([])} onRemove={toggleCompare} />
    </section>
  );
}

export default EtfListPage;
