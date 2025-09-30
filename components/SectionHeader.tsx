import type { PropsWithChildren } from "react";

interface SectionHeaderProps extends PropsWithChildren {
  title: string;
  description?: string;
}

export default function SectionHeader({ title, description, children }: SectionHeaderProps) {
  return (
    <header className="mb-8 space-y-2">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="text-slate-600">{description}</p> : null}
      </div>
      {children ? <div className="text-sm text-slate-500">{children}</div> : null}
    </header>
  );
}
