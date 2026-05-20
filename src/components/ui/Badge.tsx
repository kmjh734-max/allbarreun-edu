import { type ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "brand";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  danger: "bg-red-50 text-red-800 ring-1 ring-red-100",
  brand: "bg-brand-50 text-brand-800 ring-1 ring-brand-100",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/** Common status labels */
export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <Badge variant={published ? "success" : "neutral"}>
      {published ? "공개" : "비공개"}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "neutral"}>
      {active ? "활성" : "비활성"}
    </Badge>
  );
}
