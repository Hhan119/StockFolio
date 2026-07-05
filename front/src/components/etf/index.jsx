import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney, formatPercent } from "../../utils/format.js";
import { formatNullable, getPerformanceTone, NA } from "../../utils/etfCalculations.js";

export function EmptyState({ title = "데이터가 없습니다", description = "조건을 바꾸거나 잠시 후 다시 시도해주세요." }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-lg font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-900 dark:bg-rose-950/40">
      <p className="text-lg font-black text-rose-900 dark:text-rose-100">데이터를 불러오지 못했습니다</p>
      <p className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-200">{error?.message || "알 수 없는 오류가 발생했습니다."}</p>
      {onRetry && (
        <button className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-black text-white" type="button" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function SkeletonState({ rows = 3 }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={index}>
          <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EtfBadge({ children, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  }[tone];
  return <span className={`rounded-xl px-3 py-1 text-xs font-black ${toneClass}`}>{children}</span>;
}

export function RiskBadge({ label }) {
  return <EtfBadge tone={label.includes("커버드콜") || label.includes("파생") ? "rose" : "cyan"}>{label}</EtfBadge>;
}

export function DataFreshnessBadge({ metadata }) {
  if (!metadata) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-black">
      {metadata.mock && <EtfBadge tone="rose">샘플 데이터</EtfBadge>}
      {metadata.delayed && <EtfBadge tone="slate">지연 데이터</EtfBadge>}
      <span className="text-slate-500 dark:text-slate-400">기준: {metadata.asOf}</span>
      <span className="text-slate-500 dark:text-slate-400">출처: {metadata.source}</span>
    </div>
  );
}

export function MetricHelpTooltip({ text }) {
  return (
    <span className="group relative inline-flex">
      <span className="grid h-5 w-5 cursor-help place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200" tabIndex={0}>
        ?
      </span>
      <span className="pointer-events-none absolute bottom-7 left-1/2 z-10 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-950 p-3 text-xs font-bold leading-5 text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

export function EtfMetricCard({ label, value, help, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-emerald-700 dark:text-emerald-300" : tone === "negative" ? "text-rose-700 dark:text-rose-300" : "text-slate-950 dark:text-white";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        {help && <MetricHelpTooltip text={help} />}
      </div>
      <strong className={`mt-2 block text-2xl font-black ${toneClass}`}>{value ?? NA}</strong>
    </article>
  );
}

export function BeginnerSummary({ etf }) {
  const items = [
    ["무엇에 투자하나요?", etf.summary?.investsIn || etf.beginnerDescription],
    ["수익은 어떻게 얻나요?", etf.summary?.returnSource || "가격 변화와 분배금으로 수익이 발생할 수 있습니다."],
    ["어떤 장점이 있나요?", etf.pros?.join(", ")],
    ["무엇을 조심해야 하나요?", etf.cons?.join(", ")],
  ];
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {items.map(([title, body]) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" key={title}>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300">{body}</p>
        </article>
      ))}
    </section>
  );
}

export function EtfSearchBox({ suggestions = [], value, onChange, onSubmit, onSelect }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    try {
      setRecentSearches(JSON.parse(localStorage.getItem("stockfolio_recent_etf_searches") || "[]"));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const saveRecent = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((item) => item !== trimmed)].slice(0, 6);
    setRecentSearches(next);
    localStorage.setItem("stockfolio_recent_etf_searches", JSON.stringify(next));
  };

  const submit = (keyword = value) => {
    saveRecent(keyword);
    onSubmit?.(keyword);
  };

  const keyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected) {
        onSelect?.(selected);
        saveRecent(selected.ticker);
      } else {
        submit();
      }
    }
  };

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="etf-search">ETF 검색</label>
      <input
        className="form-control min-h-16 rounded-2xl text-base font-bold"
        id="etf-search"
        placeholder="티커, 한글명, 영문명, 운용사, 추종 지수, 투자 전략 검색"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={keyDown}
      />
      {value && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[4.5rem] z-30 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {suggestions.slice(0, 8).map((etf, index) => (
            <button
              className={`grid w-full grid-cols-[72px_1fr] gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${index === activeIndex ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              key={etf.slug}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                onSelect?.(etf);
                saveRecent(etf.ticker);
              }}
            >
              <span className="font-black text-slate-950 dark:text-white">{etf.ticker}</span>
              <span className="text-slate-600 dark:text-slate-300">{etf.name}</span>
            </button>
          ))}
        </div>
      )}
      {recentSearches.length > 0 && !value && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-black text-slate-500">최근 검색</span>
          {recentSearches.map((item) => (
            <button className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-slate-200" key={item} type="button" onClick={() => onChange(item)}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HighlightText({ text, keyword }) {
  if (!keyword?.trim()) return text;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === keyword.trim().toLowerCase() ? <mark className="rounded bg-cyan-100 px-1 text-cyan-900" key={`${part}-${index}`}>{part}</mark> : part,
  );
}

export function EtfResultCard({ etf, keyword = "", onToggleCompare, onToggleWatch, compareSelected }) {
  const tone = getPerformanceTone(etf.performance.totalReturn.oneYear);
  const performanceLabel = formatNullable(etf.performance.totalReturn.oneYear, (value) => `${value > 0 ? "▲ +" : value < 0 ? "▼ " : ""}${formatPercent(value)}`);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link className="text-xl font-black text-slate-950 hover:text-cyan-700 dark:text-white" to={`/etf/${etf.slug}`}>
            <HighlightText text={etf.ticker} keyword={keyword} />
          </Link>
          <h3 className="mt-1 font-black text-slate-800 dark:text-slate-200"><HighlightText text={etf.name} keyword={keyword} /></h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <EtfBadge tone={etf.listingRegion === "domestic" ? "emerald" : "cyan"}>{etf.regionLabel}</EtfBadge>
          <EtfBadge>{etf.category}</EtfBadge>
          {etf.metadata.mock && <EtfBadge tone="rose">샘플 데이터</EtfBadge>}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{etf.beginnerDescription}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <EtfMetricMini label="현재가" value={formatNullable(etf.quote.currentPrice, (value) => formatMoney(value, etf.currency))} />
        <EtfMetricMini label="최근 12개월 분배율" value={formatNullable(etf.distribution.ttmDistributionRate, formatPercent)} />
        <EtfMetricMini label="총보수" value={formatNullable(etf.cost.expenseRatio, formatPercent)} />
        <EtfMetricMini label="1년 총수익률" value={performanceLabel} tone={tone} />
      </div>
      <DataFreshnessBadge metadata={etf.metadata} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950" to={`/etf/${etf.slug}`}>상세보기</Link>
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-slate-200" type="button" onClick={() => onToggleCompare?.(etf)}>
          {compareSelected ? "비교해제" : "비교담기"}
        </button>
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-900 hover:text-white dark:bg-slate-800 dark:text-slate-200" type="button" onClick={() => onToggleWatch?.(etf)}>
          관심등록
        </button>
      </div>
    </article>
  );
}

function EtfMetricMini({ label, value, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-emerald-700 dark:text-emerald-300" : tone === "negative" ? "text-rose-700 dark:text-rose-300" : "text-slate-950 dark:text-white";
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-xs font-black text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

export function EtfResultTable({ items, keyword = "", onToggleCompare, compareItems = [] }) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            {["ETF", "초보자 설명", "분배율", "분배 주기", "총보수", "1년 총수익률", "기준 시각", "작업"].map((head) => <th className="p-4" key={head}>{head}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((etf) => {
            const selected = compareItems.some((item) => item.ticker === etf.ticker);
            const oneYear = etf.performance.totalReturn.oneYear;
            return (
              <tr className="align-top" key={etf.slug}>
                <td className="p-4">
                  <Link className="font-black text-slate-950 hover:text-cyan-700 dark:text-white" to={`/etf/${etf.slug}`}><HighlightText text={etf.ticker} keyword={keyword} /></Link>
                  <p className="mt-1 font-bold text-slate-600 dark:text-slate-300"><HighlightText text={etf.name} keyword={keyword} /></p>
                  <div className="mt-2 flex gap-2"><EtfBadge>{etf.category}</EtfBadge><EtfBadge tone={etf.listingRegion === "domestic" ? "emerald" : "cyan"}>{etf.regionLabel}</EtfBadge></div>
                </td>
                <td className="max-w-xs p-4 font-semibold leading-6 text-slate-600 dark:text-slate-300">{etf.beginnerDescription}</td>
                <td className="p-4 font-black">{formatNullable(etf.distribution.ttmDistributionRate, formatPercent)}</td>
                <td className="p-4 font-bold">{etf.distribution.frequency}</td>
                <td className="p-4 font-black">{formatNullable(etf.cost.expenseRatio, formatPercent)}</td>
                <td className={`p-4 font-black ${getPerformanceTone(oneYear) === "positive" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                  {formatNullable(oneYear, (value) => `${value > 0 ? "▲ +" : value < 0 ? "▼ " : ""}${formatPercent(value)}`)}
                </td>
                <td className="p-4 text-xs font-bold text-slate-500">{etf.metadata.asOf}</td>
                <td className="p-4">
                  <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-950 hover:text-white dark:bg-slate-800 dark:text-slate-200" type="button" onClick={() => onToggleCompare?.(etf)}>
                    {selected ? "비교해제" : "비교담기"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CompareTray({ items, maxItems = 4, onRemove, onClear }) {
  if (!items.length) return null;
  const tickers = items.map((item) => item.ticker).join(",");
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:bottom-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">비교담기 {items.length}/{maxItems}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {items.map((item) => (
              <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200" key={item.ticker} type="button" onClick={() => onRemove?.(item)}>
                {item.ticker} ×
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200" type="button" onClick={onClear}>비우기</button>
          <Link className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950" to={`/etf/compare?tickers=${encodeURIComponent(tickers)}`}>비교하기</Link>
        </div>
      </div>
    </div>
  );
}

export function EtfCompareTable({ etfs }) {
  const rows = [
    ["투자 대상", (etf) => etf.indexName],
    ["투자 전략", (etf) => etf.strategy],
    ["분배 주기", (etf) => etf.distribution.frequency],
    ["최근 12개월 분배율", (etf) => formatNullable(etf.distribution.ttmDistributionRate, formatPercent)],
    ["총보수", (etf) => formatNullable(etf.cost.expenseRatio, formatPercent)],
    ["순자산 규모(AUM)", (etf) => formatNullable(etf.aum, (value) => formatMoney(value, etf.currency))],
    ["1년 총수익률", (etf) => formatNullable(etf.performance.totalReturn.oneYear, formatPercent)],
    ["3년 총수익률", (etf) => formatNullable(etf.performance.totalReturn.threeYear, formatPercent)],
    ["5년 총수익률", (etf) => formatNullable(etf.performance.totalReturn.fiveYear, formatPercent)],
    ["변동성", (etf) => formatNullable(etf.risk.volatility, formatPercent)],
    ["최대 낙폭", (etf) => formatNullable(etf.risk.maxDrawdown, formatPercent)],
    ["상위 10개 종목 비중", (etf) => formatNullable(etf.top10Concentration, formatPercent)],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="p-4">항목</th>
            {etfs.map((etf) => <th className="p-4" key={etf.ticker}>{etf.ticker}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map(([label, getter]) => (
            <tr key={label}>
              <td className="p-4 font-black text-slate-700 dark:text-slate-200">{label}</td>
              {etfs.map((etf) => <td className="p-4 font-bold text-slate-700 dark:text-slate-300" key={`${label}-${etf.ticker}`}>{getter(etf)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DistributionChart({ history = [] }) {
  const max = Math.max(...history.map((item) => item.amount), 0);
  return (
    <div className="grid gap-2">
      {history.map((item) => (
        <div className="grid grid-cols-[92px_1fr_80px] items-center gap-3 text-xs font-bold" key={item.date}>
          <span className="text-slate-500">{item.date.slice(5)}</span>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800" aria-label={`${item.date} 분배금 ${item.amount}`}>
            <div className="h-3 rounded-full bg-cyan-600" style={{ width: `${max ? (item.amount / max) * 100 : 0}%` }} />
          </div>
          <span className="text-right text-slate-700 dark:text-slate-200">{item.amount}</span>
        </div>
      ))}
    </div>
  );
}

export function TotalReturnChart({ series = [] }) {
  return (
    <div className="grid gap-3">
      {series.map((item) => (
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800" key={item.period}>
          <div className="flex justify-between text-xs font-black text-slate-500"><span>{item.period}</span><span>ETF {formatPercent(item.etf)}</span></div>
          <div className="mt-2 grid gap-1">
            {[
              ["ETF", item.etf, "bg-cyan-600"],
              ["추종 지수", item.index, "bg-emerald-600"],
              ["카테고리 평균", item.categoryAverage, "bg-slate-400"],
            ].map(([label, value, color]) => (
              <div className="grid grid-cols-[86px_1fr_54px] items-center gap-2 text-xs font-bold" key={label}>
                <span>{label}</span>
                <div className="h-2 rounded-full bg-white dark:bg-slate-900"><div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(Math.abs(value), 30) * 3}%` }} /></div>
                <span className="text-right">{formatPercent(value)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HoldingsTable({ holdings = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="p-3">종목</th><th className="p-3">티커</th><th className="p-3 text-right">비중</th></tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {holdings.map((holding) => <tr key={`${holding.name}-${holding.ticker}`}><td className="p-3 font-bold">{holding.name}</td><td className="p-3 font-black">{holding.ticker}</td><td className="p-3 text-right font-black">{formatNullable(holding.weight, formatPercent)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function SectorAllocationChart({ allocations = [] }) {
  return (
    <div className="grid gap-3">
      {allocations.map((allocation) => (
        <div key={allocation.label}>
          <div className="flex justify-between text-sm font-black text-slate-700 dark:text-slate-200"><span>{allocation.label}</span><span>{formatNullable(allocation.weight, formatPercent)}</span></div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${allocation.weight || 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function RankingMethodology({ children }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold leading-7 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">순위 산정 기준</h3>
      <p className="mt-2">{children}</p>
    </aside>
  );
}

export function InvestmentDisclaimer() {
  return (
    <p className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold leading-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      본 화면의 정보는 투자 참고용이며 특정 ETF의 매수·매도 추천이 아닙니다. 과거 수익률과 과거 분배금은 미래 수익률과 분배금을 보장하지 않습니다. Mock 데이터는 실제 금융 데이터와 다를 수 있습니다.
    </p>
  );
}

export function AdSlot({ label = "광고" }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">AdSense 스크립트 연결 전 광고 자리입니다.</p>
    </div>
  );
}
