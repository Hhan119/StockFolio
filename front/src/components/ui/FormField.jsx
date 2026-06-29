function FormField({ label, error, className = "", ...props }) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <input
        className={[
          "form-control",
          error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : "",
        ].join(" ")}
        {...props}
      />
      {error && <span className="text-xs font-bold text-rose-600">{error}</span>}
    </label>
  );
}

export default FormField;
