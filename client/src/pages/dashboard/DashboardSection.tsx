import type { ReactNode } from 'react';

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
}

/** The one card shell all four dashboard sections share. */
export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5">
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      {children}
    </section>
  );
}
