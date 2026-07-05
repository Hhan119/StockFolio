import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney, formatPercent } from "../../utils/format.js";

function EtfDividendCalculator() {
  return (
    <>
      <Seo title="ETF 배당 계산기" description="보유 수량, 주당 배당금, 지급 횟수, 세율을 기준으로 ETF의 세전/세후 배당금을 계산합니다." path="/calculators/etf-dividend" />
      <CalculatorShell
        title="ETF 배당 계산기"
        description="보유 수량과 주당 배당금을 기준으로 세전/세후 연 배당금과 월 평균 배당금을 계산합니다."
        initialValues={{ shares: 100, price: 50000, dividendPerShare: 500, paymentsPerYear: 12, taxRate: 15.4 }}
        fields={[
          { name: "shares", label: "보유 수량" },
          { name: "price", label: "현재가", step: 0.01 },
          { name: "dividendPerShare", label: "1회 주당 배당금", step: 0.01 },
          { name: "paymentsPerYear", label: "연 배당 횟수" },
          { name: "taxRate", label: "배당 세율(%)", step: 0.1 },
        ]}
        usage={[
          "ETF의 1회 주당 배당금과 1년에 지급되는 횟수를 입력합니다.",
          "보유 수량과 현재가를 입력해 투자금 대비 배당률을 확인합니다.",
          "세율을 조정해 실제 받을 가능성이 높은 세후 배당금을 비교합니다.",
        ]}
        calculateResult={(v) => {
          const investedAmount = v.shares * v.price;
          const annualDividendBeforeTax = v.shares * v.dividendPerShare * v.paymentsPerYear;
          const annualDividendAfterTax = annualDividendBeforeTax * (1 - v.taxRate / 100);
          return {
            investedAmount,
            annualDividendBeforeTax,
            annualDividendAfterTax,
            monthlyDividendAfterTax: annualDividendAfterTax / 12,
            dividendYield: investedAmount ? (annualDividendBeforeTax / investedAmount) * 100 : 0,
          };
        }}
        mapResult={(r) => [
          { label: "투자 원금", value: formatMoney(r.investedAmount, "KRW") },
          { label: "세전 연 배당", value: formatMoney(r.annualDividendBeforeTax, "KRW") },
          { label: "세후 연 배당", value: formatMoney(r.annualDividendAfterTax, "KRW"), tone: "positive" },
          { label: "월 평균 배당", value: formatMoney(r.monthlyDividendAfterTax, "KRW") },
          { label: "배당률", value: formatPercent(r.dividendYield) },
        ]}
        why="ETF 배당 계산기는 배당률만 보고 판단하기보다 실제 보유 수량 기준으로 얼마의 현금흐름이 생기는지 확인하는 데 필요합니다. 분배금은 ETF가 보유한 자산에서 발생한 이익을 투자자에게 나누는 금액이며, 주식 배당금과 표현은 다르지만 투자자 입장에서는 현금흐름으로 해석할 수 있습니다."
        formula="투자 원금 = 현재가 × 보유 수량, 세전 연 배당금 = 보유 수량 × 1회 주당 배당금 × 연 지급 횟수, 세후 배당금 = 세전 배당금 × (1 - 세율), 배당률 = 세전 연 배당금 ÷ 투자 원금 × 100"
        scenario="예를 들어 5만 원 ETF 100주를 보유하고, 1회 주당 분배금이 500원이며 매월 지급된다면 세전 연 배당금은 60만 원입니다. 세율 15.4%를 적용하면 실제 월평균 수령액은 더 낮아집니다."
        interpretation="배당률이 높을수록 현금흐름은 커 보이지만, 분배금이 줄어들거나 ETF 가격이 하락하면 총수익률은 낮아질 수 있습니다. 월배당 ETF와 분기배당 ETF는 지급 빈도 차이일 뿐 안정성을 보장하지 않습니다."
        warnings={["배당금은 확정 수익이 아닙니다.", "해외 ETF는 환율과 원천징수세 영향을 받습니다.", "과거 분배금은 미래 분배금을 보장하지 않습니다."]}
        relatedLinks={[
          { label: "월배당 계산기", to: "/calculators/monthly-dividend" },
          { label: "배당 ETF 순위", to: "/etf/rankings/high-dividend" },
          { label: "배당 가이드", to: "/dividends/guide" },
        ]}
      />
    </>
  );
}

export default EtfDividendCalculator;
