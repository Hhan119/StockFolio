import CalculatorShell from "../../components/CalculatorShell.jsx";

function AveragePriceCalculator() {
  return (
    <CalculatorShell
      title="평단가 계산기"
      description="추가 매수 후 평균 매수가가 어떻게 바뀌는지 계산합니다. 물타기나 분할매수 계획을 세울 때 활용하세요."
      endpoint="/api/calculators/average-price"
      initialValues={{ currentQuantity: 10, currentAveragePrice: 58000, additionalQuantity: 5, additionalPrice: 54000 }}
      fields={[
        { name: "currentQuantity", label: "현재 보유 수량" },
        { name: "currentAveragePrice", label: "현재 평균단가", step: 0.01 },
        { name: "additionalQuantity", label: "추가 매수 수량" },
        { name: "additionalPrice", label: "추가 매수가", step: 0.01 },
      ]}
      usage={[
        "현재 보유 수량과 기존 평균단가를 입력합니다.",
        "추가로 매수할 수량과 매수가를 입력합니다.",
        "총 투자금과 새 평균단가를 확인해 매수 여부를 판단합니다.",
      ]}
      mapResult={(r) => [
        { label: "총 보유 수량", value: r.totalQuantity.toLocaleString() },
        { label: "추가 투자금", value: r.additionalInvestment.toLocaleString() },
        { label: "총 투자금", value: r.totalInvestment.toLocaleString() },
        { label: "새 평균단가", value: r.averagePrice.toLocaleString(), tone: "positive" },
      ]}
    />
  );
}

export default AveragePriceCalculator;
