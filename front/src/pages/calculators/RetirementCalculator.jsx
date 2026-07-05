import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function RetirementCalculator() {
  return (
    <>
      <Seo title="은퇴 계산기" description="은퇴 목표 나이까지 월 납입액과 기대수익률을 반영한 예상 은퇴 자산을 계산합니다." path="/calculators/retirement" />
      <CalculatorShell
        title="은퇴 계산기"
        description="은퇴 목표 나이까지 매월 투자했을 때 예상 은퇴 자산이 어느 정도인지 계산합니다."
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
        calculateResult={(v) => {
          const years = Math.max(v.retirementAge - v.currentAge, 0);
          const months = years * 12;
          const monthlyRate = v.annualReturnRate / 100 / 12;
          let projectedAssets = v.currentSavings;
          for (let i = 0; i < months; i += 1) {
            projectedAssets = projectedAssets * (1 + monthlyRate) + v.monthlyContribution;
          }
          return {
            years,
            totalContributions: v.currentSavings + v.monthlyContribution * months,
            projectedAssets,
          };
        }}
        mapResult={(r) => [
          { label: "투자 기간", value: `${r.years}년` },
          { label: "총 납입액", value: formatMoney(r.totalContributions, "KRW") },
          { label: "예상 은퇴 자산", value: formatMoney(r.projectedAssets, "KRW"), tone: "positive" },
        ]}
        why="은퇴 준비는 목표 시점과 월 납입액을 숫자로 정해야 현실적인 계획이 됩니다. 단순히 많이 모으겠다는 목표보다 기간, 납입액, 기대수익률을 함께 계산해야 부족분을 빨리 발견할 수 있습니다."
        formula="예상 은퇴 자산은 현재 저축액에 월 복리 수익률을 적용하고 매월 납입액을 더하는 방식으로 계산합니다. 월 수익률 = 연 수익률 ÷ 12"
        scenario="35세에 3,000만 원을 가지고 매월 100만 원씩 60세까지 투자한다면 25년 동안 총 납입액과 예상 자산을 비교할 수 있습니다."
        interpretation="예상 자산이 목표 생활비에 부족하다면 은퇴 나이, 월 납입액, 투자 수익률, 지출 수준을 함께 조정해야 합니다."
        warnings={["수익률은 매년 일정하지 않습니다.", "은퇴 후 지출은 물가와 건강 상태에 따라 커질 수 있습니다.", "국민연금과 퇴직연금은 별도로 반영해야 합니다."]}
        relatedLinks={[
          { label: "FIRE 계산기", to: "/calculators/fire" },
          { label: "복리 계산기", to: "/calculators/compound" },
          { label: "은퇴 자금 글", to: "/blog/retirement-money" },
        ]}
      />
    </>
  );
}

export default RetirementCalculator;
