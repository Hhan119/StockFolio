import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "./StatCard.jsx";

function CalculatorShell({
  title,
  description,
  fields,
  initialValues,
  calculateResult,
  mapResult,
  usage = [],
  why = "",
  formula = "",
  scenario = "",
  interpretation = "",
  warnings = [],
  relatedLinks = [],
}) {
  const [values, setValues] = useState(initialValues);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: Number(value) }));
  };

  const calculate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setResult(calculateResult(values));
    } catch (err) {
      setError(err.message);
    }
  };

  const cards = result ? mapResult(result) : [];
  const guide = usage.length
    ? usage
    : ["필요한 값을 입력합니다.", "계산하기를 누르면 오른쪽에 결과가 표시됩니다.", "여러 시나리오를 바꿔가며 비교합니다."];

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700">Calculator</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold text-slate-600">{description}</p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            입력 → 계산 → 비교
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(420px,520px)_1fr]">
        <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={calculate}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-slate-950">입력값</h3>
            <span className="text-xs font-bold text-slate-500">프론트에서 즉시 계산</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-1 text-sm font-bold text-slate-700">
                {field.label}
                <input
                  className="form-control bg-slate-50"
                  min={field.min ?? 0}
                  name={field.name}
                  step={field.step ?? 1}
                  type="number"
                  value={values[field.name]}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
              </label>
            ))}
          </div>
          <button className="mt-4 w-full rounded-2xl bg-cyan-700 px-4 py-3 font-black text-white shadow-sm hover:bg-slate-950">
            계산하기
          </button>
          {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
        </form>

        <div className="grid gap-4">
          {result ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {cards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Preview</p>
              <h3 className="mt-1 font-black text-slate-950">입력값을 바꾸고 계산해보세요</h3>
              <p className="mt-2 text-sm font-bold text-slate-600">
                결과 영역은 총액, 월평균, 수익률처럼 판단에 필요한 핵심 숫자만 카드로 보여줍니다.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-black text-slate-950">사용 방법</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {guide.map((item, index) => (
                <div className="rounded-2xl bg-slate-50 p-4" key={item}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-700 text-sm font-black text-white">{index + 1}</span>
                  <p className="mt-3 text-sm font-bold text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">계산기를 쓰는 이유</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{why || description}</p>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">계산 공식</p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">{formula}</p>
          </div>
          <div className="mt-4 rounded-2xl bg-cyan-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-cyan-700">예시 시나리오</p>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">{scenario}</p>
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-950">결과 해석과 주의사항</h3>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{interpretation}</p>
          <ul className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
            {warnings.map((warning) => (
              <li className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800" key={warning}>{warning}</li>
            ))}
          </ul>
          {relatedLinks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">관련 페이지</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedLinks.map((link) => (
                  <Link className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-900 hover:text-white" key={link.to} to={link.to}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <p className="mt-4 rounded-xl bg-slate-950 px-3 py-3 text-xs font-bold leading-6 text-white">
            이 계산기는 입력값을 바탕으로 한 단순 추정 도구이며, 실제 수익률과 배당금은 시장 상황, 환율, 세금, ETF 정책에 따라 달라질 수 있습니다.
          </p>
        </aside>
      </div>
    </section>
  );
}

export default CalculatorShell;
