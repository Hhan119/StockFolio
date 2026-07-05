import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function FireCalculator() {
  return (
    <>
      <Seo title="FIRE 계산기" description="연간 지출, 저축액, 기대수익률, 인출률로 경제적 자유 목표 자산과 예상 기간을 계산합니다." path="/calculators/fire" />
      <CalculatorShell
        title="FIRE 계산기"
        description="연간 지출과 저축액을 기준으로 경제적 자유 목표 자산과 목표 달성까지 걸리는 기간을 추정합니다."
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
        calculateResult={(v) => {
          const targetAssets = v.annualExpenses / (v.withdrawalRate / 100);
          let projectedAssets = v.currentAssets;
          let yearsToFire = 0;
          while (projectedAssets < targetAssets && yearsToFire < 80) {
            projectedAssets = projectedAssets * (1 + v.expectedReturnRate / 100) + v.annualSavings;
            yearsToFire += 1;
          }
          return { targetAssets, yearsToFire, projectedAssets };
        }}
        mapResult={(r) => [
          { label: "FIRE 목표 자산", value: formatMoney(r.targetAssets, "KRW") },
          { label: "예상 소요 기간", value: `${r.yearsToFire}년` },
          { label: "목표 시점 자산", value: formatMoney(r.projectedAssets, "KRW"), tone: "positive" },
        ]}
        why="FIRE 계산은 막연한 조기 은퇴 목표를 숫자로 바꾸는 과정입니다. 현재 자산, 연간 지출, 저축 가능 금액, 기대수익률을 함께 넣어야 목표 자산과 기간이 현실적인지 판단할 수 있습니다."
        formula="목표 자산 = 연간 지출 ÷ 인출률, 다음 해 자산 = 현재 자산 × (1 + 기대수익률) + 연간 저축액"
        scenario="연간 지출이 3,000만 원이고 4% 인출률을 가정하면 목표 자산은 약 7억 5천만 원입니다. 현재 자산과 저축액을 넣으면 몇 년 뒤 목표에 접근할 수 있는지 추정할 수 있습니다."
        interpretation="기간이 너무 길게 나오면 지출을 낮추거나 저축률을 높이거나 기대수익률 가정을 재검토해야 합니다. 기대수익률은 보수적으로 잡는 것이 좋습니다."
        warnings={["4% 인출률은 모든 시장에서 보장되는 법칙이 아닙니다.", "물가 상승률과 세금은 결과를 크게 바꿀 수 있습니다.", "은퇴 후 의료비와 비정기 지출도 별도 계획이 필요합니다."]}
        relatedLinks={[
          { label: "은퇴 계산기", to: "/calculators/retirement" },
          { label: "적립식 투자", to: "/calculators/dca" },
          { label: "FIRE 변수 글", to: "/blog/fire-inputs" },
        ]}
      />
    </>
  );
}

export default FireCalculator;
