import CalculatorShell from "../../components/CalculatorShell.jsx";
import Seo from "../../components/Seo.jsx";
import { formatMoney } from "../../utils/format.js";

function AveragePriceCalculator() {
  return (
    <>
      <Seo title="평단가 계산기" description="추가 매수 후 평균 매수가와 총 투자금을 계산합니다." path="/calculators/average-price" />
      <CalculatorShell
        title="평단가 계산기"
        description="추가 매수 후 평균 매수가가 어떻게 바뀌는지 계산합니다. 물타기나 분할매수 계획을 세울 때 활용하세요."
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
        calculateResult={(v) => {
          const currentInvestment = v.currentQuantity * v.currentAveragePrice;
          const additionalInvestment = v.additionalQuantity * v.additionalPrice;
          const totalQuantity = v.currentQuantity + v.additionalQuantity;
          const totalInvestment = currentInvestment + additionalInvestment;
          return {
            totalQuantity,
            additionalInvestment,
            totalInvestment,
            averagePrice: totalQuantity ? totalInvestment / totalQuantity : 0,
          };
        }}
        mapResult={(r) => [
          { label: "총 보유 수량", value: r.totalQuantity.toLocaleString("ko-KR") },
          { label: "추가 투자금", value: formatMoney(r.additionalInvestment, "KRW") },
          { label: "총 투자금", value: formatMoney(r.totalInvestment, "KRW") },
          { label: "새 평균단가", value: formatMoney(r.averagePrice, "KRW"), tone: "positive" },
        ]}
        why="평단가는 수익률 계산의 기준이 되기 때문에 추가 매수 전에 꼭 확인해야 합니다. 가격이 낮아졌다고 무조건 매수하기보다 추가 매수 후 전체 비중과 손익분기점이 어떻게 변하는지 보는 것이 중요합니다."
        formula="새 평균단가 = (기존 수량 × 기존 평균단가 + 추가 수량 × 추가 매수가) ÷ (기존 수량 + 추가 수량)"
        scenario="삼성전자 10주를 평균 58,000원에 보유하고 5주를 54,000원에 추가 매수하면 총 15주의 평균단가가 다시 계산됩니다. 새 평단은 이후 수익률과 손익 계산의 기준이 됩니다."
        interpretation="평단가가 낮아져도 총 투자금과 특정 종목 비중은 커집니다. 분산투자 원칙과 리밸런싱 기준을 함께 확인해야 합니다."
        warnings={["평단가 하락이 손실 회복을 보장하지 않습니다.", "동일 종목 집중도가 높아질 수 있습니다.", "거래 수수료와 세금은 별도로 고려해야 합니다."]}
        relatedLinks={[
          { label: "포트폴리오", to: "/portfolio/my" },
          { label: "리밸런싱", to: "/analysis/rebalancing" },
          { label: "수익률 계산 글", to: "/blog/average-price-return" },
        ]}
      />
    </>
  );
}

export default AveragePriceCalculator;
