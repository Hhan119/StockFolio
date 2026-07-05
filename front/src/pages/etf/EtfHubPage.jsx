import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import {
  AdSlot,
  EmptyState,
  ErrorState,
  EtfBadge,
  EtfSearchBox,
  InvestmentDisclaimer,
  SkeletonState,
} from "../../components/etf/index.jsx";
import { etfMockApi, MOCK_ETFS } from "../../services/etfMockApi.js";
import { formatNullable } from "../../utils/etfCalculations.js";
import { formatPercent } from "../../utils/format.js";

function EtfHubPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["etf-hub-summary"],
    queryFn: () => etfMockApi.getHubSummary(),
  });

  const suggestions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return [];
    return MOCK_ETFS.filter((etf) => [etf.ticker, etf.name, etf.provider, etf.indexName, etf.strategy].join(" ").toLowerCase().includes(normalized)).slice(0, 8);
  }, [keyword]);

  const goSearch = (nextKeyword = keyword) => {
    navigate(`/etf/search${nextKeyword ? `?keyword=${encodeURIComponent(nextKeyword)}` : ""}`);
  };

  if (isLoading) return <SkeletonState rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const summary = data?.data;
  if (!summary) return <EmptyState title="ETF 허브 데이터가 없습니다" />;

  return (
    <section className="grid gap-5">
      <Seo title="ETF 탐색 허브" description="ETF 검색, 유형별 바로가기, 고배당·월배당·배당성장 ETF TOP 5를 제공합니다." path="/etf" />
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm lg:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">ETF Explorer</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-black leading-tight lg:text-5xl">ETF가 어디에 투자하고 어떻게 분배금을 주는지 5초 안에 파악하세요</h2>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
          초보자 설명은 먼저, 총보수·순자산 규모(AUM)·최근 12개월(TTM) 분배율·위험 지표는 단계적으로 보여주는 탐색 화면입니다.
        </p>
        <div className="mt-6 max-w-3xl">
          <EtfSearchBox
            suggestions={suggestions}
            value={keyword}
            onChange={setKeyword}
            onSubmit={goSearch}
            onSelect={(etf) => navigate(`/etf/${etf.slug}`)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.popularKeywords.map((item) => (
            <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white hover:text-slate-950" key={item} type="button" onClick={() => goSearch(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summary.typeShortcuts.map((type) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-950 hover:text-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" key={type} to={`/etf/search?keyword=${encodeURIComponent(type)}`}>
            {type}
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Today</p>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">오늘 많이 본 ETF</h3>
          </div>
          <EtfBadge tone="rose">샘플 데이터</EtfBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.mostViewed.map((etf) => (
            <Link className="rounded-2xl bg-slate-50 p-4 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700" key={etf.slug} to={`/etf/${etf.slug}`}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-lg font-black text-slate-950 dark:text-white">{etf.ticker}</p><p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{etf.name}</p></div>
                <EtfBadge tone={etf.listingRegion === "domestic" ? "emerald" : "cyan"}>{etf.regionLabel}</EtfBadge>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{etf.beginnerDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      <AdSlot />

      <div className="grid gap-4 xl:grid-cols-3">
        <RankingPreview title="고배당 ETF TOP 5" items={summary.highDividend} to="/etf/rankings/high-dividend" />
        <RankingPreview title="월배당 ETF TOP 5" items={summary.monthly} to="/etf/rankings/monthly-dividend" />
        <RankingPreview title="배당성장 ETF TOP 5" items={summary.growth} to="/etf/rankings/dividend-growth" />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">ETF 초보자 가이드</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
            ETF는 여러 자산을 하나의 상품처럼 거래할 수 있게 만든 펀드입니다. 분배금은 ETF가 보유한 자산에서 발생한 현금흐름을 투자자에게 나눠주는 개념이며, 매월 같은 금액이 보장되는 것은 아닙니다.
          </p>
          <Link className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" to="/dividends/guide">배당금 기초 가이드</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">관련 계산기</h3>
          <div className="mt-4 grid gap-2">
            <Link className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-950 hover:text-white dark:bg-slate-800 dark:text-slate-200" to="/calculators/etf-dividend">ETF 분배금 계산기</Link>
            <Link className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-950 hover:text-white dark:bg-slate-800 dark:text-slate-200" to="/calculators/monthly-dividend">월분배 계산기</Link>
            <Link className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-950 hover:text-white dark:bg-slate-800 dark:text-slate-200" to="/calculators/dividend-reinvestment">분배금 재투자 계산기</Link>
          </div>
        </article>
      </section>

      <InvestmentDisclaimer />
    </section>
  );
}

function RankingPreview({ title, items, to }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>
        <Link className="text-xs font-black text-cyan-700 dark:text-cyan-300" to={to}>더보기</Link>
      </div>
      <div className="mt-4 grid gap-2">
        {items.map((etf, index) => (
          <Link className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-800" key={etf.slug} to={`/etf/${etf.slug}`}>
            <span className="font-black text-slate-400">#{index + 1}</span>
            <span className="font-black text-slate-800 dark:text-slate-200">{etf.ticker}</span>
            <span className="font-black text-emerald-700 dark:text-emerald-300">{formatNullable(etf.distribution.ttmDistributionRate, formatPercent)}</span>
          </Link>
        ))}
      </div>
    </article>
  );
}

export default EtfHubPage;
