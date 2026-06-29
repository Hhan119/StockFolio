import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";

function DividendAnalysisPage() {
  return (
    <section>
      <PageHeader eyebrow="analysis" title="배당 분석" description="배당률, 배당 성장률, 월별 현금흐름을 분석합니다." />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="평균 배당률" value="4.2%" />
        <StatCard label="배당 성장률" value="12.5%" tone="positive" />
        <StatCard label="월평균 배당" value="170,000" />
      </div>
    </section>
  );
}

export default DividendAnalysisPage;
