import CalculatorShell from "../../components/CalculatorShell.jsx";

function DcaCalculator() {
  return (
    <CalculatorShell
      title="적립식 투자 계산기"
      description="초기 투자금과 매월 적립액을 기준으로 장기 복리 투자 결과를 계산합니다."
      endpoint="/api/calculators/dca"
      initialValues={{ initialInvestment: 10000000, monthlyContribution: 500000, years: 10, annualReturnRate: 7 }}
      fields={[
        { name: "initialInvestment", label: "초기 투자금" },
        { name: "monthlyContribution", label: "월 적립액" },
        { name: "years", label: "투자 기간(년)" },
        { name: "annualReturnRate", label: "연 수익률(%)", step: 0.1 },
      ]}
      usage={[
        "처음 투자할 금액과 매월 추가로 적립할 금액을 입력합니다.",
        "투자 기간과 기대 수익률을 조정해 여러 경우를 비교합니다.",
        "총 납입액, 예상 평가금액, 예상 수익을 함께 확인합니다.",
      ]}
      mapResult={(r) => [
        { label: "총 납입액", value: r.totalContributions.toLocaleString() },
        { label: "예상 평가금액", value: r.futureValue.toLocaleString(), tone: "positive" },
        { label: "예상 수익", value: r.estimatedProfit.toLocaleString(), tone: "positive" },
      ]}
    />
  );
}

export default DcaCalculator;
