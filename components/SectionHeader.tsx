import type { PropsWithChildren } from "react";

interface SectionHeaderProps extends PropsWithChildren {
  title: string;
  description?: string;
  highlightTone?: "default" | "light";
}

export default function SectionHeader({ title, description, children, highlightTone = "default" }: SectionHeaderProps) {
  const wrapperClass =
    highlightTone === "light"
      ? "mb-8 space-y-2 rounded-3xl border border-white/60 bg-white/70 px-6 py-5 shadow-sm backdrop-blur-md"
      : "mb-8 space-y-2";
  const titleClass = highlightTone === "light" ? "text-3xl font-semibold text-slate-900" : "text-3xl font-semibold text-slate-900";
  const descriptionClass = highlightTone === "light" ? "text-slate-700" : "text-slate-600";
  const statusClass = highlightTone === "light" ? "text-sm text-slate-600" : "text-sm text-slate-500";

  return (
    <header className={wrapperClass}>
      <div>
        <h1 className={titleClass}>{title}</h1>
        {description ? <p className={descriptionClass}>{description}</p> : null}
      </div>
      {children ? <div className={statusClass}>{children}</div> : null}
    </header>
  );
}
