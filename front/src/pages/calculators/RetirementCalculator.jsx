import CalculatorShell from "../../components/CalculatorShell.jsx";

function RetirementCalculator() {
  return (
    <CalculatorShell
      title="은퇴 계산기"
      description="은퇴 목표 나이까지 매월 투자했을 때 예상 은퇴 자산이 어느 정도인지 계산합니다."
      endpoint="/api/calculators/retirement"
      initialValues={{ currentAge: 35, retirementAge: 60, currentSavings: 30000000, monthlyContribution: 1000000, annualReturnRate: 5 }}
      fields={[
        { name: "currentAge", label: "현재 나이" },
        { name: "retirementAge", label: "은퇴 나이" },
        { name: "currentSavings", label: "현재 저축액" },
        { name: "monthlyContribution", label: "월 납입액" },
        { name: "annualReturnRate", label: "연 수익률(%)", step: 0.1 },
      ]}
      usage={[
        "현재 나이와 은퇴 목표 나이를 입력해 투자 기간을 정합니다.",
        "현재 저축액과 매월 납입 가능한 금액을 입력합니다.",
        "연 수익률 가정에 따라 은퇴 시점의 예상 자산을 확인합니다.",
      ]}
      mapResult={(r) => [
        { label: "투자 기간", value: `${r.years}년` },
        { label: "총 납입액", value: r.totalContributions.toLocaleString() },
        { label: "예상 은퇴 자산", value: r.projectedAssets.toLocaleString(), tone: "positive" },
      ]}
    />
  );
}

export default RetirementCalculator;
