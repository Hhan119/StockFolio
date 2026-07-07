import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MarketSegmentedControl from "../../components/MarketSegmentedControl.jsx";
import Seo from "../../components/Seo.jsx";
import { EtfBadge, InvestmentDisclaimer } from "../../components/etf/index.jsx";
import { DATA_AS_OF, etfs } from "../../data/publicContent.js";
import { formatMoney, formatPercent } from "../../utils/format.js";

const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const frequencyOptions = [
  ["all", "분배 주기 전체"],
  ["월", "월배당"],
  ["분기", "분기배당"],
  ["반기", "반기배당"],
  ["연", "연배당"],
];

const getRegion = (etf) => {
  const marketText = `${etf.market || ""} ${etf.name || ""}`;
  return etf.currency === "KRW" || /KRX|KOSPI|KOSDAQ|한국|국내/.test(marketText) ? "domestic" : "overseas";
};

function PublicDividendCalendarPage() {
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const events = useMemo(
    () => etfs.flatMap((etf) => (etf.distributionMonths || []).map((monthNumber) => ({
      amount: etf.latestDividend,
      category: etf.category,
      currency: etf.currency,
      dividendYield: etf.dividendYield,
      frequency: etf.dividendFrequency,
      market: etf.market,
      month: monthNames[monthNumber - 1],
      monthNumber,
      name: etf.name,
      provider: etf.provider,
      region: getRegion(etf),
      slug: etf.slug,
      ticker: etf.ticker,
    }))),
    [],
  );

  const counts = useMemo(
    () => ({
      all: etfs.length,
      domestic: etfs.filter((etf) => getRegion(etf) === "domestic").length,
      overseas: etfs.filter((etf) => getRegion(etf) === "overseas").length,
    }),
    [],
  );

  const filteredEvents = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return events
      .filter((event) => region === "all" || event.region === region)
      .filter((event) => frequency === "all" || event.frequency === frequency)
      .filter((event) => selectedMonth === "all" || String(event.monthNumber) === selectedMonth)
      .filter((event) => !normalized || [event.ticker, event.name, event.provider, event.category, event.market].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => a.monthNumber - b.monthNumber || a.ticker.localeCompare(b.ticker));
  }, [events, frequency, keyword, region, selectedMonth]);

  const monthlyCounts = useMemo(
    () => monthNames.map((month, index) => ({
      count: events
        .filter((event) => region === "all" || event.region === region)
        .filter((event) => frequency === "all" || event.frequency === frequency)
        .filter((event) => !keyword.trim() || [event.ticker, event.name, event.provider, event.category, event.market].join(" ").toLowerCase().includes(keyword.trim().toLowerCase()))
        .filter((event) => event.monthNumber === index + 1).length,
      month,
      monthNumber: index + 1,
    })),
    [events, frequency, keyword, region],
  );

  const topMonth = monthlyCounts.reduce((best, item) => (item.count > best.count ? item : best), monthlyCounts[0]);
  const filteredEtfCount = new Set(filteredEvents.map((event) => event.ticker)).size;
  const monthlyDividendCount = new Set(filteredEvents.filter((event) => event.frequency === "월").map((event) => event.ticker)).size;
  const selectedMonthLabel = selectedMonth === "all" ? "전체 월" : monthNames[Number(selectedMonth) - 1];

  const resetFilters = () => {
    setKeyword("");
    setRegion("all");
    setFrequency("all");
    setSelectedMonth("all");
  };

  return (
    <section className="grid gap-5">
      <Seo title="월별 배당 ETF 캘린더" description="월별 ETF 배당 지급 예정 정보를 공개 정적 데이터로 확인합니다." path="/dividends/calendar" />

      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm lg:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-300">Dividend Calendar</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-black leading-tight lg:text-5xl">ETF 분배금 지급 월을 빠르게 탐색하세요</h2>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
          ETF 검색 화면처럼 종목명, 티커, 국내/해외, 분배 주기, 지급 월을 기준으로 공개 배당 캘린더를 필터링할 수 있습니다.
          데이터 기준일은 {DATA_AS_OF}이며 실제 전 배당일과 지급일은 운용사 공지를 확인해야 합니다.
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="form-control border-slate-800 bg-white text-slate-950 placeholder:text-slate-400"
            placeholder="SCHD, JEPI, 월배당, Vanguard"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Link className="btn-muted min-h-12 text-sm" to="/etf/search">
            ETF 검색으로 이동
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Calendar Filter</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">배당 캘린더 필터</h3>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">국내/해외, 분배 주기, 지급 월을 조합해 공개 ETF 배당 일정을 좁혀봅니다.</p>
          </div>
          <MarketSegmentedControl counts={counts} value={region} onChange={setRegion} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select className="form-control bg-slate-50 dark:bg-slate-800" value={frequency} onChange={(event) => setFrequency(event.target.value)}>
            {frequencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="form-control bg-slate-50 dark:bg-slate-800" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            <option value="all">지급 월 전체</option>
            {monthNames.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
          </select>
          <button className="btn-muted min-h-12 text-sm" type="button" onClick={resetFilters}>
            초기화
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <EtfBadge tone="cyan">{selectedMonthLabel}</EtfBadge>
            <EtfBadge tone={region === "domestic" ? "emerald" : region === "overseas" ? "cyan" : "slate"}>{region === "all" ? "전체 시장" : region === "domestic" ? "국내" : "해외"}</EtfBadge>
            <EtfBadge tone="slate">{frequency === "all" ? "전체 주기" : frequency}</EtfBadge>
          </div>
          <span className="text-sm font-black text-slate-500 dark:text-slate-400">검색 결과 {filteredEvents.length}건</span>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CalendarMetric label="대상 ETF" value={`${filteredEtfCount}개`} />
        <CalendarMetric label="배당 이벤트" value={`${filteredEvents.length}건`} />
        <CalendarMetric label="월배당 ETF" value={`${monthlyDividendCount}개`} />
        <CalendarMetric label="집중 월" value={`${topMonth.month} · ${topMonth.count}건`} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Monthly Map</p>
            <h3 className="text-2xl font-black text-slate-950 dark:text-white">월별 지급 예정</h3>
          </div>
          <button className="btn-muted text-sm" type="button" onClick={() => setSelectedMonth("all")}>
            전체 월 보기
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {monthlyCounts.map((item) => {
            const active = selectedMonth === String(item.monthNumber);
            return (
              <button
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  active ? "border-cyan-500 bg-cyan-50 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-100" : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
                ].join(" ")}
                key={item.month}
                type="button"
                onClick={() => setSelectedMonth(String(item.monthNumber))}
              >
                <span className="text-lg font-black">{item.month}</span>
                <span className="mt-2 block text-sm font-bold opacity-80">{item.count}건 예정</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredEvents.map((event) => <DividendEventCard event={event} key={`${event.monthNumber}-${event.ticker}`} />)}
        {filteredEvents.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">조건에 맞는 배당 이벤트가 없습니다</h3>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">검색어, 시장, 분배 주기, 지급 월 조건을 조정해보세요.</p>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        이 캘린더는 공개용 정적 데이터 기반 미리보기입니다. 회원용 포트폴리오 배당 캘린더는 보유 수량을 반영해 예상 수령액을 계산하지만, 공개 페이지는 ETF별 1회 분배금과 지급 월을 이해하는 용도로 제공합니다.
      </div>

      <InvestmentDisclaimer />
    </section>
  );
}

function CalendarMetric({ label, value }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <strong className="mt-2 block text-2xl font-black text-slate-950 dark:text-white">{value}</strong>
    </article>
  );
}

function DividendEventCard({ event }) {
  return (
    <Link className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-900 dark:hover:bg-cyan-950/40" to={`/etf/${event.slug}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{event.month} 지급 예정</p>
          <h3 className="mt-1 truncate text-xl font-black text-slate-950 dark:text-white">{event.ticker}</h3>
          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-600 dark:text-slate-300">{event.name}</p>
        </div>
        <EtfBadge tone={event.region === "domestic" ? "emerald" : "cyan"}>{event.region === "domestic" ? "국내" : "해외"}</EtfBadge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400">1회 분배금</p>
          <strong className="mt-1 block text-lg font-black text-slate-950 dark:text-white">{formatMoney(event.amount, event.currency)}</strong>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400">분배율</p>
          <strong className="mt-1 block text-lg font-black text-emerald-700 dark:text-emerald-300">{formatPercent(event.dividendYield)}</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <EtfBadge tone="slate">{event.frequency}</EtfBadge>
        <EtfBadge tone="slate">{event.market}</EtfBadge>
        <EtfBadge tone="slate">{event.category}</EtfBadge>
      </div>
    </Link>
  );
}

export default PublicDividendCalendarPage;
