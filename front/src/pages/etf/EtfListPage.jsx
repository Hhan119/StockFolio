import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import {
  CompareTray,
  EtfSearchBox,
} from "../../components/etf/index.jsx";
import { etfMarketService, toEtfSuggestion } from "../../services/etfMarketService.js";
import { formatMoney } from "../../utils/format.js";

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

const regionToMarket = (region) => {
  if (region === "domestic") return "KR";
  if (region === "overseas") return "US";
  return "ALL";
};

const normalizeText = (value) => String(value || "").toUpperCase();

const liveResultKey = (item, index) => `${item.market || "ETF"}-${item.ticker || item.name}-${index}`;

const matchesAssetFilter = (item, assetType) => {
  if (assetType === "all") return true;
  const text = normalizeText([item?.name, item?.exchange].filter(Boolean).join(" "));
  const isBond = ["채권", "국채", "BOND", "TREASURY", "KOFR"].some((keyword) => text.includes(keyword));
  const isReit = ["리츠", "REIT", "REAL ESTATE"].some((keyword) => text.includes(keyword));
  if (assetType === "bond") return isBond;
  if (assetType === "reit") return isReit;
  return !isBond && !isReit;
};

const sourceLabel = (source = "") => {
  if (source.includes("krx")) return "KRX";
  if (source.includes("naver")) return "네이버";
  if (source.includes("fmp")) return "FMP";
  if (source.includes("yahoo")) return "Yahoo";
  if (source.includes("fallback")) return "보조 데이터";
  return source || "검색 API";
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
  const [compareItems, setCompareItems] = useState([]);
  const debouncedKeyword = useDebouncedValue(keyword);
  const liveMarket = regionToMarket(filters.region);

  const maxCompareItems = typeof window !== "undefined" && window.innerWidth < 768 ? 3 : 4;

  const counts = useMemo(
    () => ({}),
    [],
  );

  const liveSearchQuery = useQuery({
    queryKey: ["etf-live-search", debouncedKeyword, liveMarket],
    queryFn: () => etfMarketService.searchEtfs(debouncedKeyword, liveMarket, 80),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const liveItems = useMemo(() => {
    const seen = new Set();
    return (liveSearchQuery.data || [])
      .filter((item) => matchesAssetFilter(item, filters.assetType))
      .filter((item) => {
        const key = `${item.market}-${item.ticker}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 80);
  }, [filters.assetType, liveSearchQuery.data]);

  const suggestions = useMemo(() => {
    if (!keyword.trim()) return [];
    return liveItems.slice(0, 8).map(toEtfSuggestion);
  }, [keyword, liveItems]);

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

  const syncKeyword = (nextKeyword) => {
    setKeyword(nextKeyword);
    setSearchParams(nextKeyword ? { keyword: nextKeyword } : {});
  };

  const selectSuggestion = (etf) => {
    if (etf?.ticker) {
      navigate(`/etf/${etf.ticker.toLowerCase()}`);
      return;
    }
    syncKeyword(etf?.ticker || etf?.name || "");
  };

  const totalResultCount = liveItems.length;

  return (
    <section className="grid gap-5 pb-28 lg:pb-4">
      <Seo title="ETF 검색" description="상장 국가, 자산 유형, 투자 목적, 분배 주기, 총보수 등을 기준으로 ETF를 검색합니다." path="/etf/search" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">ETF Search</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">ETF 검색</h2>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">국내·해외 ETF 전체 목록을 한 기준으로 검색하며 티커와 종목명 자동완성을 지원합니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={filters.region} onChange={(value) => updateFilter("region", value)} />
        </div>
        <div className="mt-5">
          <EtfSearchBox
            suggestions={suggestions}
            value={keyword}
            onChange={syncKeyword}
            onSubmit={syncKeyword}
            onSelect={selectSuggestion}
          />
        </div>
        <div className="mt-4 max-w-sm">
          <select className="form-control bg-slate-50 dark:bg-slate-800" value={filters.assetType} onChange={(event) => updateFilter("assetType", event.target.value)}>
            {filterOptions.assetType.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {selectedChips.length ? selectedChips.map((chip) => <span className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700" key={chip}>{chip}</span>) : <span className="text-sm font-bold text-slate-500">선택된 필터 없음</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-500 dark:text-slate-300">검색 결과 {totalResultCount}개</span>
          </div>
        </div>
      </div>

      <LiveEtfSearchResults
        compareItems={compareItems}
        error={liveSearchQuery.error}
        isLoading={liveSearchQuery.isFetching && !liveSearchQuery.data}
        items={liveItems}
        keyword={debouncedKeyword}
        onToggleCompare={toggleCompare}
      />

      <CompareTray items={compareItems} maxItems={maxCompareItems} onClear={() => setCompareItems([])} onRemove={toggleCompare} />
    </section>
  );
}

function LiveEtfSearchResults({ items, isLoading, error, keyword, compareItems, onToggleCompare }) {
  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-900 dark:bg-cyan-950/30">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Market Search</p>
          <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">최신 ETF 검색 결과</h3>
          <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">국내는 KRX·네이버, 해외는 FMP·Yahoo 보조 소스를 포함한 ETF 목록에서 검색합니다.</p>
        </div>
        <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
          {keyword} · {items.length}개
        </span>
      </div>

      {isLoading && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-32 animate-pulse rounded-2xl bg-white/80 dark:bg-slate-900/70" key={index} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm font-bold text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-200">
          최신 ETF 검색을 불러오지 못했습니다. 아래 콘텐츠 검색 결과는 계속 확인할 수 있습니다.
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="mt-4 rounded-xl bg-white p-4 text-sm font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
          실시간 검색 결과가 없습니다. 검색어를 더 구체적으로 입력하거나 필터를 변경해보세요.
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <LiveEtfSearchCard
              compareSelected={compareItems.some((selected) => selected.ticker === item.ticker)}
              item={item}
              key={liveResultKey(item, index)}
              onToggleCompare={onToggleCompare}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LiveEtfSearchCard({ item, compareSelected, onToggleCompare }) {
  const hasPrice = Number(item.currentPrice || 0) > 0;
  const comparisonItem = toEtfSuggestion(item);
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-950 dark:text-white">{item.ticker}</p>
          <h4 className="mt-1 line-clamp-2 text-sm font-black text-slate-700 dark:text-slate-200">{item.name}</h4>
        </div>
        <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {item.market === "KR" ? "국내" : "해외"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400">현재가</p>
          <p className="mt-1 font-black text-slate-950 dark:text-white">{hasPrice ? formatMoney(item.currentPrice, item.currency) : "확인중"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400">출처</p>
          <p className="mt-1 truncate font-black text-slate-950 dark:text-white">{sourceLabel(item.source)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{item.exchange || "ETF"}</span>
        {item.dividendAvailable && <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">분배금</span>}
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <Link className="btn-dark flex-1 text-center text-xs" to={`/etf/${String(item.ticker).toLowerCase()}`}>상세보기</Link>
        <button className="btn-muted flex-1 text-xs" type="button" onClick={() => onToggleCompare(comparisonItem)}>
          {compareSelected ? "비교해제" : "비교담기"}
        </button>
      </div>
    </article>
  );
}

export default EtfListPage;
