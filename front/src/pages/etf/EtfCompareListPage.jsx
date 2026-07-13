import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import {
  AdSlot,
  EmptyState,
  ErrorState,
  EtfBadge,
  EtfCompareTable,
  EtfSearchBox,
  InvestmentDisclaimer,
  SkeletonState,
} from "../../components/etf/index.jsx";
import { comparisonMatchesMarketFilter, comparisons, getComparisonEtfs, isDomesticEtf } from "../../data/publicContent.js";
import { etfMarketService, toEtfSuggestion } from "../../services/etfMarketService.js";

function EtfCompareListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [marketFilter, setMarketFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const tickers = (searchParams.get("tickers") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const maxItems = 4;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const counts = useMemo(
    () => ({}),
    [],
  );

  const filteredComparisons = useMemo(
    () => comparisons.filter((comparison) => comparisonMatchesMarketFilter(comparison, marketFilter)),
    [marketFilter],
  );

  const suggestionQuery = useQuery({
    queryKey: ["etf-compare-suggestions", debouncedKeyword, marketFilter],
    queryFn: () => etfMarketService.searchEtfs(
      debouncedKeyword,
      marketFilter === "domestic" ? "KR" : marketFilter === "overseas" ? "US" : "ALL",
      40,
    ),
    enabled: debouncedKeyword.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const suggestions = useMemo(
    () => (suggestionQuery.data || []).map(toEtfSuggestion),
    [suggestionQuery.data],
  );

  const compareQuery = useQuery({
    queryKey: ["etf-compare", tickers.join(",")],
    queryFn: () => etfMarketService.compareEtfs(tickers),
    enabled: tickers.length > 0,
    retry: false,
  });

  const setTickers = (nextTickers) => setSearchParams(nextTickers.length ? { tickers: nextTickers.join(",") } : {});

  const addEtf = (etf) => {
    if (tickers.includes(etf.ticker) || tickers.length >= maxItems) return;
    setTickers([...tickers, etf.ticker]);
    setKeyword("");
  };

  const removeTicker = (ticker) => setTickers(tickers.filter((item) => item !== ticker));

  const shareUrl = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <section className="grid gap-5">
      <Seo title="ETF 비교" description="최대 4개 ETF를 분배율, 총보수, 순자산 규모, 총수익률, 위험 지표 기준으로 비교합니다." path="/etf/compare" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">ETF Compare</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">ETF 비교</h2>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">ETF 추가 검색, 제거, 공유 URL을 지원합니다. 어떤 ETF가 우월하다고 단정하지 않습니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={marketFilter} onChange={setMarketFilter} />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <EtfSearchBox suggestions={suggestions} value={keyword} onChange={setKeyword} onSelect={addEtf} onSubmit={() => {}} />
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-black text-slate-500">선택 ETF {tickers.length}/{maxItems}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tickers.map((ticker) => (
                <button className="btn-muted text-xs" key={ticker} type="button" onClick={() => removeTicker(ticker)}>
                  {ticker} ×
                </button>
              ))}
            </div>
            <button className="btn-dark mt-3 text-xs" type="button" onClick={shareUrl}>비교 URL 복사</button>
          </div>
        </div>
        {suggestionQuery.isFetching && <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">ETF 전체 목록을 검색하고 있습니다.</p>}
        {suggestionQuery.isError && <p className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-300">ETF 검색 공급자에 연결하지 못했습니다.</p>}
      </div>

      {tickers.length === 0 && (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredComparisons.map((comparison) => {
              const comparisonEtfs = getComparisonEtfs(comparison);
              const domestic = comparisonEtfs.every(isDomesticEtf);
              return (
                <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md dark:border-slate-800 dark:bg-slate-900" key={comparison.slug} to={`/etf/compare?tickers=${comparisonEtfs.map((etf) => etf.ticker).join(",")}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">{comparison.title}</h3>
                    <EtfBadge tone={domestic ? "emerald" : "cyan"}>{domestic ? "국내" : "해외"}</EtfBadge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{comparison.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{comparisonEtfs.map((etf) => <EtfBadge key={etf.slug}>{etf.ticker}</EtfBadge>)}</div>
                </Link>
              );
            })}
          </div>
          {filteredComparisons.length === 0 && <EmptyState title="비교 프리셋이 없습니다" description="다른 시장 구분을 선택하거나 ETF를 직접 검색해 추가하세요." />}
        </>
      )}

      {tickers.length > 0 && compareQuery.isLoading && <SkeletonState rows={3} />}
      {tickers.length > 0 && compareQuery.isError && <ErrorState error={compareQuery.error} onRetry={compareQuery.refetch} />}
      {tickers.length > 0 && compareQuery.data?.data?.length > 0 && (
        <section className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {compareQuery.data.data.map((etf) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={etf.ticker}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-2xl font-black text-slate-950 dark:text-white">{etf.ticker}</p><p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{etf.name}</p></div>
                  <button className="btn-muted text-xs" type="button" onClick={() => removeTicker(etf.ticker)}>제거</button>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{etf.strategy}</p>
              </article>
            ))}
          </div>
          <EtfCompareTable etfs={compareQuery.data.data} />
          <AdSlot />
          <BeginnerCompareGuide />
          <InvestmentDisclaimer />
        </section>
      )}
    </section>
  );
}

function BeginnerCompareGuide() {
  const guides = [
    ["분배 현금흐름 관점", "최근 12개월 분배율과 지급 주기를 함께 봅니다. 월분배라도 금액이 일정하다는 뜻은 아닙니다."],
    ["분배 성장 관점", "분배금 연평균 성장률과 연속 증가 이력을 확인합니다. 운용 기간이 짧으면 N/A가 나올 수 있습니다."],
    ["장기 성장 관점", "5년 총수익률과 추종 지수 성격을 함께 비교합니다. 분배율이 낮아도 장기 성과가 다를 수 있습니다."],
    ["비용 관점", "총보수가 낮을수록 장기 비용 부담은 줄지만, 실제 비용은 추적오차와 거래비용도 영향을 줍니다."],
    ["분산 관점", "상위 10개 종목 비중과 섹터 집중도를 확인합니다."],
    ["위험 관점", "변동성, 최대 낙폭, 커버드콜·파생상품 활용 여부를 함께 봅니다."],
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {guides.map(([title, body]) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={title}>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{body}</p>
        </article>
      ))}
    </div>
  );
}

export default EtfCompareListPage;
