import CalculatorShell from "../../components/CalculatorShell.jsx";

function EtfDividendCalculator() {
  return (
    <CalculatorShell
      title="ETF 배당 계산기"
      description="보유 수량과 주당 배당금을 기준으로 세전/세후 연 배당금과 월 평균 배당금을 계산합니다."
      endpoint="/api/calculators/etf-dividend"
      initialValues={{ shares: 100, price: 50000, dividendPerShare: 500, paymentsPerYear: 12, taxRate: 15.4 }}
      fields={[
        { name: "shares", label: "보유 수량" },
        { name: "price", label: "현재가", step: 0.01 },
        { name: "dividendPerShare", label: "주당 배당금", step: 0.01 },
        { name: "paymentsPerYear", label: "연 배당 횟수" },
        { name: "taxRate", label: "배당 세율(%)", step: 0.1 },
      ]}
      usage={[
        "ETF의 주당 배당금과 1년에 지급되는 횟수를 입력합니다.",
        "보유 수량과 현재가를 입력해 투자금 대비 배당률을 확인합니다.",
        "세율을 조정해 실제 받을 가능성이 높은 세후 배당금을 비교합니다.",
      ]}
      mapResult={(r) => [
        { label: "투자 원금", value: r.investedAmount.toLocaleString() },
        { label: "세전 연 배당", value: r.annualDividendBeforeTax.toLocaleString() },
        { label: "세후 연 배당", value: r.annualDividendAfterTax.toLocaleString(), tone: "positive" },
        { label: "월 평균 배당", value: r.monthlyDividendAfterTax.toLocaleString() },
        { label: "배당률", value: `${r.dividendYield.toFixed(2)}%` },
      ]}
    />
  );
}

export default EtfDividendCalculator;
