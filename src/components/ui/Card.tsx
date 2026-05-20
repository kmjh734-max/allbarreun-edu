import Link from "next/link";
import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-card ${className}`.trim()}
    >
      {children}
    </div>
  );
}

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
  stat?: number;
  statLabel?: string;
  icon?: ReactNode;
}

export function DashboardCard({
  href,
  title,
  description,
  stat,
  statLabel,
  icon,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-brand-200 hover:shadow-card-hover sm:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
            {icon}
          </div>
        )}
        {stat !== undefined && (
          <div className="text-right">
            <p className="text-xl font-bold text-brand-700">{stat}</p>
            {statLabel && (
              <p className="text-xs text-slate-500">{statLabel}</p>
            )}
          </div>
        )}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-brand-800">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      <span className="mt-4 text-sm font-medium text-brand-600 group-hover:underline">
        이동하기 →
      </span>
    </Link>
  );
}
