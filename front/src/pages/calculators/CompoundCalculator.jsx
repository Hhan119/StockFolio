import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function CompoundCalculator() {
  return (
    <>
      <Seo title="복리 계산기" description="초기 금액, 기간, 연 수익률, 추가 납입액을 기준으로 복리 효과를 계산합니다." path="/calculators/compound" />
      <CalculatorShell
        title="복리 계산기"
        description="초기 투자금과 정기 납입액이 시간이 지날수록 어떻게 성장하는지 계산합니다."
        initialValues={{ principal: 10000000, annualReturnRate: 7, years: 20, monthlyContribution: 300000 }}
        fields={[
          { name: "principal", label: "초기 투자금" },
          { name: "annualReturnRate", label: "연 수익률(%)", step: 0.1 },
          { name: "years", label: "기간(년)" },
          { name: "monthlyContribution", label: "월 추가 납입액" },
        ]}
        usage={[
          "초기 투자금과 투자 기간을 입력합니다.",
          "기대 수익률과 월 추가 납입액을 입력합니다.",
          "복리로 누적된 평가금액과 총 납입액을 비교합니다.",
        ]}
        calculateResult={(v) => {
          const months = v.years * 12;
          const monthlyRate = v.annualReturnRate / 100 / 12;
          let futureValue = v.principal;
          for (let i = 0; i < months; i += 1) {
            futureValue = futureValue * (1 + monthlyRate) + v.monthlyContribution;
          }
          const totalContributions = v.principal + v.monthlyContribution * months;
          return {
            futureValue,
            totalContributions,
            compoundProfit: futureValue - totalContributions,
            multiple: totalContributions ? futureValue / totalContributions : 0,
          };
        }}
        mapResult={(r) => [
          { label: "미래 평가금액", value: formatMoney(r.futureValue, "KRW"), tone: "positive" },
          { label: "총 납입액", value: formatMoney(r.totalContributions, "KRW") },
          { label: "복리 수익", value: formatMoney(r.compoundProfit, "KRW"), tone: "positive" },
          { label: "납입액 대비 배수", value: `${r.multiple.toFixed(2)}배` },
        ]}
        why="복리는 시간이 길어질수록 수익이 다시 수익을 만드는 구조입니다. 투자 기간이 길수록 수익률 차이가 최종 금액에 크게 반영되므로 장기 목표를 세울 때 핵심 계산이 됩니다."
        formula="월 복리 기준으로 매월 평가금액 = 이전 평가금액 × (1 + 연 수익률 ÷ 12) + 월 추가 납입액"
        scenario="1,000만 원을 시작으로 매월 30만 원씩 20년간 투자하고 연 7% 수익률을 가정하면 단순 납입액보다 복리 수익이 크게 누적됩니다."
        interpretation="복리 효과는 시간이 필요합니다. 단기 성과보다 납입 지속성과 비용 관리가 더 중요한 이유를 숫자로 확인할 수 있습니다."
        warnings={["수익률은 일정하게 발생하지 않습니다.", "인플레이션을 고려한 실질 수익률은 더 낮을 수 있습니다.", "장기 투자에서도 손실 구간은 발생할 수 있습니다."]}
        relatedLinks={[
          { label: "적립식 투자 계산기", to: "/calculators/dca" },
          { label: "은퇴 계산기", to: "/calculators/retirement" },
          { label: "수수료 영향 글", to: "/blog/expense-ratio-impact" },
        ]}
      />
    </>
  );
}

export default CompoundCalculator;
