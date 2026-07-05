import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function DividendReinvestmentCalculator() {
  return (
    <>
      <Seo title="배당 재투자 계산기" description="배당금을 다시 투자했을 때 보유 자산과 배당금이 어떻게 성장하는지 계산합니다." path="/calculators/dividend-reinvestment" />
      <CalculatorShell
        title="배당 재투자 계산기"
        description="배당금을 소비하지 않고 재투자했을 때 장기 자산과 배당금 증가 효과를 추정합니다."
        initialValues={{ initialInvestment: 20000000, dividendYield: 4, annualGrowthRate: 5, years: 15, taxRate: 15.4 }}
        fields={[
          { name: "initialInvestment", label: "초기 투자금" },
          { name: "dividendYield", label: "연 배당률(%)", step: 0.1 },
          { name: "annualGrowthRate", label: "연 가격 성장률(%)", step: 0.1 },
          { name: "years", label: "투자 기간(년)" },
          { name: "taxRate", label: "배당 세율(%)", step: 0.1 },
        ]}
        usage={[
          "초기 투자금과 예상 배당률을 입력합니다.",
          "가격 성장률과 세율을 보수적으로 가정합니다.",
          "배당 재투자 후 최종 자산과 마지막 해 배당금을 확인합니다.",
        ]}
        calculateResult={(v) => {
          let portfolioValue = v.initialInvestment;
          let lastAnnualDividendAfterTax = 0;
          for (let year = 0; year < v.years; year += 1) {
            const annualDividend = portfolioValue * (v.dividendYield / 100);
            lastAnnualDividendAfterTax = annualDividend * (1 - v.taxRate / 100);
            portfolioValue = (portfolioValue + lastAnnualDividendAfterTax) * (1 + v.annualGrowthRate / 100);
          }
          return {
            portfolioValue,
            lastAnnualDividendAfterTax,
            totalProfit: portfolioValue - v.initialInvestment,
            monthlyDividendAtEnd: lastAnnualDividendAfterTax / 12,
          };
        }}
        mapResult={(r) => [
          { label: "최종 평가금액", value: formatMoney(r.portfolioValue, "KRW"), tone: "positive" },
          { label: "누적 증가분", value: formatMoney(r.totalProfit, "KRW"), tone: "positive" },
          { label: "마지막 해 세후 배당", value: formatMoney(r.lastAnnualDividendAfterTax, "KRW") },
          { label: "마지막 해 월평균 배당", value: formatMoney(r.monthlyDividendAtEnd, "KRW") },
        ]}
        why="배당 재투자는 현금흐름을 다시 자산으로 바꿔 장기 복리 효과를 키우는 전략입니다. 특히 배당 성장 ETF를 오래 보유할 때 배당금 자체가 다음 배당의 원천이 될 수 있습니다."
        formula="매년 세후 배당금 = 평가금액 × 배당률 × (1 - 세율), 다음 해 평가금액 = (평가금액 + 세후 배당금) × (1 + 가격 성장률)"
        scenario="2,000만 원을 연 배당률 4%, 가격 성장률 5%로 15년간 재투자한다고 가정하면 최종 자산과 마지막 해 배당금의 차이를 확인할 수 있습니다."
        interpretation="재투자는 단기 현금흐름을 포기하는 대신 장기 자산 증가를 기대하는 방식입니다. 은퇴 전에는 재투자, 은퇴 후에는 인출처럼 단계별 전략을 나눌 수 있습니다."
        warnings={["배당 재투자는 가격 하락 위험을 없애지 않습니다.", "배당 삭감이 발생하면 결과가 크게 달라집니다.", "세금과 환율이 재투자 가능 금액을 줄일 수 있습니다."]}
        relatedLinks={[
          { label: "배당 성장 ETF", to: "/etf/rankings/dividend-growth" },
          { label: "ETF 배당 계산기", to: "/calculators/etf-dividend" },
          { label: "배당 재투자 글", to: "/blog/dividend-reinvestment" },
        ]}
      />
    </>
  );
}

export default DividendReinvestmentCalculator;
