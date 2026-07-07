function FormField({ label, error, className = "", inputClassName = "", ...props }) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-800 ${className}`}>
      {label}
      <input
        className={[
          "form-control bg-white text-slate-950 placeholder:text-slate-400",
          error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "border-slate-300",
          inputClassName,
        ].join(" ")}
        {...props}
      />
      {error && <span className="text-xs font-bold text-rose-600">{error}</span>}
    </label>
  );
}

export default FormField;
