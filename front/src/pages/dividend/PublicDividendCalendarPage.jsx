import { Link } from "react-router-dom";
import Seo from "../../components/Seo.jsx";
import { DATA_AS_OF, etfs } from "../../data/publicContent.js";
import { formatMoney } from "../../utils/format.js";

const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function PublicDividendCalendarPage() {
  const monthlyEvents = monthNames.map((month, index) => {
    const monthNumber = index + 1;
    const events = etfs
      .filter((etf) => etf.distributionMonths.includes(monthNumber))
      .map((etf) => ({
        ticker: etf.ticker,
        name: etf.name,
        slug: etf.slug,
        amount: etf.latestDividend,
        currency: etf.currency,
        frequency: etf.dividendFrequency,
      }));
    return { month, events };
  });

  return (
    <section className="grid gap-5">
      <Seo title="월별 배당 ETF 캘린더" description="월별 ETF 배당 지급 예정 정보를 공개 정적 데이터로 확인합니다." path="/dividends/calendar" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-700">Dividend Calendar</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">월별 배당 ETF 캘린더</h2>
        <p className="mt-2 text-sm font-bold text-slate-600">데이터 기준일: {DATA_AS_OF}. 실제 전 배당일과 지급일은 운용사 공지를 확인해야 합니다.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {monthlyEvents.map(({ month, events }) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={month}>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-950">{month}</h3>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{events.length}개</span>
            </div>
            <div className="mt-4 grid gap-2">
              {events.slice(0, 7).map((event) => (
                <Link className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-cyan-700 hover:text-white" key={`${month}-${event.ticker}`} to={`/etf/${event.slug}`}>
                  <span className="font-black">{event.ticker}</span> · {event.name}
                  <span className="mt-1 block text-xs opacity-80">예상 1회 분배금 {formatMoney(event.amount, event.currency)} · {event.frequency}</span>
                </Link>
              ))}
              {events.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">등록된 배당 이벤트가 없습니다.</p>}
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold leading-7 text-slate-600 shadow-sm">
        이 캘린더는 공개용 정적 데이터 기반 미리보기입니다. 회원용 포트폴리오 배당 캘린더는 보유 수량을 반영해 예상 수령액을 계산하지만, 공개 페이지는 ETF별 1회 분배금과 지급 월을 이해하는 용도로 제공합니다.
      </div>
    </section>
  );
}

export default PublicDividendCalendarPage;
