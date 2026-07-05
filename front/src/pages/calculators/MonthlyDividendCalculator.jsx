import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney, formatPercent } from "../../utils/format.js";

function MonthlyDividendCalculator() {
  return (
    <>
      <Seo title="월배당 계산기" description="월 목표 배당금을 만들기 위해 필요한 투자금과 세후 배당 현금흐름을 계산합니다." path="/calculators/monthly-dividend" />
      <CalculatorShell
        title="월배당 계산기"
        description="목표 월 배당금과 예상 배당률을 기준으로 필요한 투자금과 세후 현금흐름을 계산합니다."
        initialValues={{ targetMonthlyDividend: 500000, dividendYield: 5, taxRate: 15.4, currentInvestment: 30000000 }}
        fields={[
          { name: "targetMonthlyDividend", label: "목표 월 배당금" },
          { name: "dividendYield", label: "예상 연 배당률(%)", step: 0.1 },
          { name: "taxRate", label: "배당 세율(%)", step: 0.1 },
          { name: "currentInvestment", label: "현재 투자금" },
        ]}
        usage={[
          "월마다 받고 싶은 세후 배당금 목표를 입력합니다.",
          "ETF의 예상 연 배당률과 세율을 입력합니다.",
          "필요 투자금과 현재 부족한 금액을 비교합니다.",
        ]}
        calculateResult={(v) => {
          const annualAfterTax = v.targetMonthlyDividend * 12;
          const annualBeforeTax = annualAfterTax / (1 - v.taxRate / 100);
          const requiredInvestment = annualBeforeTax / (v.dividendYield / 100);
          const currentAnnualBeforeTax = v.currentInvestment * (v.dividendYield / 100);
          const currentMonthlyAfterTax = (currentAnnualBeforeTax * (1 - v.taxRate / 100)) / 12;
          return {
            requiredInvestment,
            shortage: Math.max(requiredInvestment - v.currentInvestment, 0),
            currentMonthlyAfterTax,
            effectiveYieldAfterTax: v.dividendYield * (1 - v.taxRate / 100),
          };
        }}
        mapResult={(r) => [
          { label: "필요 투자금", value: formatMoney(r.requiredInvestment, "KRW"), tone: "positive" },
          { label: "부족한 금액", value: formatMoney(r.shortage, "KRW"), tone: r.shortage > 0 ? "negative" : "positive" },
          { label: "현재 월 세후 배당", value: formatMoney(r.currentMonthlyAfterTax, "KRW") },
          { label: "세후 배당률", value: formatPercent(r.effectiveYieldAfterTax) },
        ]}
        why="월배당 목표를 세울 때는 배당률이 아니라 실제 필요한 투자금부터 확인해야 합니다. 같은 월 50만 원 목표라도 배당률과 세율에 따라 필요한 원금은 크게 달라집니다."
        formula="필요 투자금 = 목표 월 배당금 × 12 ÷ (1 - 세율) ÷ 연 배당률"
        scenario="세후 월 50만 원을 목표로 하고 연 배당률 5%, 세율 15.4%를 가정하면 필요한 투자금은 약 1억 4천만 원대가 됩니다."
        interpretation="목표 투자금이 너무 크다면 목표 월 배당금을 낮추거나, 배당 성장 ETF와 적립식 투자를 병행하는 방식으로 기간을 늘려 접근할 수 있습니다."
        warnings={["고배당 ETF는 원금 변동과 분배금 삭감 가능성이 있습니다.", "세율은 계좌 유형과 국가에 따라 달라질 수 있습니다.", "월배당은 지급 빈도일 뿐 안정성을 보장하지 않습니다."]}
        relatedLinks={[
          { label: "ETF 배당 계산기", to: "/calculators/etf-dividend" },
          { label: "월배당 ETF 순위", to: "/etf/rankings/monthly-dividend" },
          { label: "배당 캘린더", to: "/dividends/calendar" },
        ]}
      />
    </>
  );
}

export default MonthlyDividendCalculator;
