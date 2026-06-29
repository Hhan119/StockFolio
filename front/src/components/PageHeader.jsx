function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-black uppercase tracking-wider text-emerald-700">{eyebrow}</p>}
        <h2 className="text-3xl font-black text-slate-950">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default PageHeader;
