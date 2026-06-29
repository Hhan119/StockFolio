import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";

function PortfolioAnalysisPage() {
  return (
    <section>
      <PageHeader
        eyebrow="분석"
        title="포트폴리오 분석"
        description="수익률, 변동성, 섹터 집중도, 배당 의존도를 기준으로 포트폴리오 상태를 점검합니다."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="예상 연 수익률" value="7.8%" tone="positive" />
        <StatCard label="섹터 집중도" value="중간" />
        <StatCard label="리밸런싱 필요" value="2개 영역" />
      </div>
      <div className="metric-card mt-4">
        <h3 className="font-black">분석 메모</h3>
        <p className="mt-2 text-sm font-medium text-slate-600">
          보유 종목의 현재가, 손익률, 배당 정보를 기반으로 포트폴리오 위험과 현금흐름을 함께 분석할 수 있도록 확장 중입니다.
        </p>
      </div>
    </section>
  );
}

export default PortfolioAnalysisPage;
