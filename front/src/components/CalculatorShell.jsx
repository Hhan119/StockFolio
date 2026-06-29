import { useState } from "react";
import StatCard from "./StatCard.jsx";
import { api } from "../services/api.js";

function CalculatorShell({ title, description, fields, initialValues, endpoint, mapResult, usage = [] }) {
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
      const response = await api.post(endpoint, values);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
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

      <div className="grid gap-4 xl:grid-cols-[minmax(430px,540px)_1fr]">
        <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onSubmit={calculate}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-slate-950">입력값</h3>
            <span className="text-xs font-bold text-slate-500">숫자를 바꿔 바로 계산</span>
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

          {result ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {cards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
              {["결과 카드", "수익/비용", "목표 비교"].map((item) => (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-black text-slate-500" key={item}>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CalculatorShell;
