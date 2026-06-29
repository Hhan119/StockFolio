import { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import { analysisService } from "../../services/analysisService.js";

function AiAnalysisPage() {
  const [prompt, setPrompt] = useState("현재 배당 포트폴리오의 리스크와 개선점을 알려줘.");
  const [result, setResult] = useState(null);

  const analyze = async () => {
    setResult(await analysisService.ai(prompt));
  };

  return (
    <section>
      <PageHeader eyebrow="analysis" title="AI 분석" description="포트폴리오 상태를 자연어로 점검하는 AI 분석 화면입니다." />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="metric-card grid gap-3">
          <textarea className="form-control min-h-36" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button className="btn-primary" onClick={analyze}>분석 요청</button>
        </div>
        <div className="metric-card">
          <h3 className="font-black">분석 결과</h3>
          {result ? (
            <ul className="mt-3 grid gap-2 text-sm font-medium text-slate-700">
              {result.insights.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-medium text-slate-500">분석 요청 후 결과가 표시됩니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AiAnalysisPage;
