import CalculatorShell from "../../components/CalculatorShell.jsx";

function FireCalculator() {
  return (
    <CalculatorShell
      title="FIRE 계산기"
      description="연간 지출과 저축액을 기준으로 경제적 자유 목표 자산과 목표 달성까지 걸리는 기간을 추정합니다."
      endpoint="/api/calculators/fire"
      initialValues={{ currentAssets: 50000000, annualExpenses: 30000000, annualSavings: 20000000, expectedReturnRate: 6, withdrawalRate: 4 }}
      fields={[
        { name: "currentAssets", label: "현재 자산" },
        { name: "annualExpenses", label: "연간 지출" },
        { name: "annualSavings", label: "연간 저축액" },
        { name: "expectedReturnRate", label: "예상 수익률(%)", step: 0.1 },
        { name: "withdrawalRate", label: "인출률(%)", step: 0.1 },
      ]}
      usage={[
        "연간 지출과 목표 인출률로 필요한 목표 자산을 계산합니다.",
        "현재 자산과 매년 저축할 금액을 입력합니다.",
        "목표 도달까지 걸리는 기간을 보며 저축액과 수익률을 조정합니다.",
      ]}
      mapResult={(r) => [
        { label: "FIRE 목표 자산", value: r.targetAssets.toLocaleString() },
        { label: "예상 소요 기간", value: `${r.yearsToFire}년` },
        { label: "목표 시점 자산", value: r.projectedAssets.toLocaleString(), tone: "positive" },
      ]}
    />
  );
}

export default FireCalculator;
