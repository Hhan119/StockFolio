import PageHeader from "../../components/PageHeader.jsx";

const targets = [
  { group: "국내 주식", current: 34, target: 35, note: "목표 비중과 거의 일치" },
  { group: "해외 주식/ETF", current: 48, target: 45, note: "일부 차익 실현 검토" },
  { group: "배당 ETF", current: 12, target: 15, note: "월 배당 흐름 보강 가능" },
  { group: "현금", current: 6, target: 5, note: "추가 매수 대기 자금" },
];

function RebalancingPage() {
  return (
    <section>
      <PageHeader
        eyebrow="분석"
        title="리밸런싱"
        description="현재 비중과 목표 비중을 비교해 과대/과소 보유 영역을 점검합니다."
      />
      <div className="grid gap-3">
        {targets.map((item) => {
          const gap = item.current - item.target;
          return (
            <article className="metric-card" key={item.group}>
              <div className="flex flex-wrap justify-between gap-3 text-sm font-black">
                <span>{item.group}</span>
                <span className={Math.abs(gap) <= 2 ? "text-emerald-700" : gap > 0 ? "text-rose-700" : "text-sky-700"}>
                  현재 {item.current}% / 목표 {item.target}%
                </span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.current}%` }} />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600">{item.note}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RebalancingPage;
