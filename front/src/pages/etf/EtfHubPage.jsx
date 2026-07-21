import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import {
  AdSlot,
  EtfBadge,
  EtfSearchBox,
  InvestmentDisclaimer,
} from "../../components/etf/index.jsx";
import { stockService } from "../../services/stockService.js";
import { etfMarketService, toEtfSuggestion } from "../../services/etfMarketService.js";
import { formatMoney } from "../../utils/format.js";

const hubSummary = {
  popularKeywords: ["S&P 500", "배당 성장", "월분배", "커버드콜", "채권"],
  typeShortcuts: ["미국 대표지수", "배당 성장", "월 현금흐름", "채권", "커버드콜"],
};

function EtfHubPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);
  const suggestionQuery = useQuery({
    queryKey: ["etf-hub-suggestions", debouncedKeyword],
    queryFn: () => etfMarketService.searchEtfs(debouncedKeyword, "ALL", 8),
    enabled: debouncedKeyword.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const topEtfQuery = useQuery({
    queryKey: ["etf-daily-top", "ALL", 5],
    queryFn: () => stockService.topEtfs("ALL", 5),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const suggestions = useMemo(() => {
    return (suggestionQuery.data || []).map(toEtfSuggestion);
  }, [suggestionQuery.data]);

  const goSearch = (nextKeyword = keyword) => {
    navigate(`/etf/search${nextKeyword ? `?keyword=${encodeURIComponent(nextKeyword)}` : ""}`);
  };

  const summary = hubSummary;
  const dailyTopEtfs = topEtfQuery.data?.length ? topEtfQuery.data.slice(0, 5) : [];

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
            onSelect={(etf) => navigate(`/etf/${etf.ticker.toLowerCase()}`)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.popularKeywords.map((item) => (
            <button className="btn-ghost-dark text-xs" key={item} type="button" onClick={() => goSearch(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summary.typeShortcuts.map((type) => (
          <Link className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-800 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-800 dark:hover:bg-cyan-950 dark:hover:text-cyan-100" key={type} to={`/etf/search?keyword=${encodeURIComponent(type)}`}>
            {type}
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Daily Top</p>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">ETF 거래대금 TOP 5</h3>
            <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">KRX ETF 일별 거래대금 기준으로 하루에 한 번 캐시합니다.</p>
          </div>
          <EtfBadge tone={dailyTopEtfs.length ? "emerald" : "rose"}>{dailyTopEtfs.length ? "일일 캐시" : "보조 데이터"}</EtfBadge>
        </div>
        {dailyTopEtfs.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {dailyTopEtfs.map((etf, index) => (
              <DailyTopCard etf={etf} index={index} key={`${etf.market}-${etf.ticker}`} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">오늘의 거래대금 데이터를 불러오지 못했습니다. ETF 검색은 계속 사용할 수 있습니다.</p>
        )}
      </section>

      <AdSlot />

      <div className="grid gap-4 xl:grid-cols-3">
        <RankingPreview title="고배당 ETF 랭킹" description="TTM 분배율과 분배 안정성, 성과, 비용을 함께 평가합니다." to="/etf/rankings/high-dividend" />
        <RankingPreview title="월분배 ETF 랭킹" description="지급 규칙성과 분배 안정성을 중심으로 같은 비교군끼리 평가합니다." to="/etf/rankings/monthly-dividend" />
        <RankingPreview title="배당 성장 ETF 랭킹" description="실제 연도별 분배금 CAGR과 연속 성장 이력을 우선 확인합니다." to="/etf/rankings/dividend-growth" />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">ETF 초보자 가이드</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">
            ETF는 여러 자산을 하나의 상품처럼 거래할 수 있게 만든 펀드입니다. 분배금은 ETF가 보유한 자산에서 발생한 현금흐름을 투자자에게 나눠주는 개념이며, 매월 같은 금액이 보장되는 것은 아닙니다.
          </p>
          <Link className="btn-dark mt-4 text-sm" to="/dividends/guide">배당금 기초 가이드</Link>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">관련 계산기</h3>
          <div className="mt-4 grid gap-2">
            <Link className="btn-muted text-sm" to="/calculators/etf-dividend">ETF 분배금 계산기</Link>
            <Link className="btn-muted text-sm" to="/calculators/monthly-dividend">월분배 계산기</Link>
            <Link className="btn-muted text-sm" to="/calculators/dividend-reinvestment">분배금 재투자 계산기</Link>
          </div>
        </article>
      </section>

      <InvestmentDisclaimer />
    </section>
  );
}

function DailyTopCard({ etf, index }) {
  const card = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-black text-cyan-700 dark:text-cyan-300">#{index + 1}</span>
        <EtfBadge tone={etf.market === "KR" ? "emerald" : "cyan"}>{etf.market === "KR" ? "국내" : "해외"}</EtfBadge>
      </div>
      <p className="mt-3 truncate text-lg font-black text-slate-950 dark:text-white">{etf.ticker}</p>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm font-bold text-slate-600 dark:text-slate-300">{etf.name}</p>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
        <p className="text-xs font-black text-slate-500 dark:text-slate-400">현재가</p>
        <p className="mt-1 font-black text-slate-950 dark:text-white">{Number(etf.currentPrice || 0) > 0 ? formatMoney(etf.currentPrice, etf.currency) : "확인중"}</p>
      </div>
    </>
  );

  return <Link className="rounded-2xl bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700" to={`/etf/${etf.ticker.toLowerCase()}`}>{card}</Link>;
}

function RankingPreview({ title, description, to }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-slate-950 dark:text-white">{title}</h3>
        <Link className="text-xs font-black text-cyan-700 dark:text-cyan-300" to={to}>더보기</Link>
      </div>
      <p className="mt-4 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2"><EtfBadge>peerGroup</EtfBadge><EtfBadge tone="emerald">데이터 품질 반영</EtfBadge></div>
    </article>
  );
}

export default EtfHubPage;
