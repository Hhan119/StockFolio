import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function DcaCalculator() {
  return (
    <>
      <Seo title="적립식 투자 계산기" description="초기 투자금과 매월 적립액을 기준으로 장기 복리 투자 결과를 계산합니다." path="/calculators/dca" />
      <CalculatorShell
        title="적립식 투자 계산기"
        description="초기 투자금과 매월 적립액을 기준으로 장기 복리 투자 결과를 계산합니다."
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
        calculateResult={(v) => {
          const months = v.years * 12;
          const monthlyRate = v.annualReturnRate / 100 / 12;
          let futureValue = v.initialInvestment;
          for (let i = 0; i < months; i += 1) {
            futureValue = futureValue * (1 + monthlyRate) + v.monthlyContribution;
          }
          const totalContributions = v.initialInvestment + v.monthlyContribution * months;
          return {
            totalContributions,
            futureValue,
            estimatedProfit: futureValue - totalContributions,
          };
        }}
        mapResult={(r) => [
          { label: "총 납입액", value: formatMoney(r.totalContributions, "KRW") },
          { label: "예상 평가금액", value: formatMoney(r.futureValue, "KRW"), tone: "positive" },
          { label: "예상 수익", value: formatMoney(r.estimatedProfit, "KRW"), tone: "positive" },
        ]}
        why="적립식 투자는 매수 시점을 분산해 변동성 부담을 낮추는 방법입니다. 장기 투자에서는 매월 납입액, 기간, 수익률 가정이 결과를 크게 바꾸므로 여러 시나리오를 비교해야 합니다."
        formula="미래가치 = 초기 투자금의 복리 성장분 + 매월 납입액의 월 복리 누적분. 이 계산기는 매월 말 납입을 가정합니다."
        scenario="초기 1,000만 원과 월 50만 원을 10년간 투자하고 연 7% 수익률을 가정하면 총 납입액과 예상 평가금액의 차이를 확인할 수 있습니다."
        interpretation="예상 수익이 크더라도 중간 하락 구간을 견딜 수 있어야 합니다. 자동 납입과 리밸런싱 기준을 함께 정해두는 것이 좋습니다."
        warnings={["정액 적립이 손실을 막아주지는 않습니다.", "수익률은 기간별로 크게 달라질 수 있습니다.", "ETF 수수료와 세금은 장기 결과에 영향을 줍니다."]}
        relatedLinks={[
          { label: "복리 계산기", to: "/calculators/compound" },
          { label: "배당 재투자", to: "/calculators/dividend-reinvestment" },
          { label: "적립식 투자 글", to: "/blog/dca-benefit-limit" },
        ]}
      />
    </>
  );
}

export default DcaCalculator;
