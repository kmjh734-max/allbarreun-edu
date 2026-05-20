import { type ReactNode } from "react";

type AlertVariant = "error" | "success" | "info";

const styles: Record<AlertVariant, string> = {
  error: "border-red-100 bg-red-50 text-red-800",
  success: "border-emerald-100 bg-emerald-50 text-emerald-800",
  info: "border-brand-100 bg-brand-50 text-brand-800",
};

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

export function Alert({
  children,
  variant = "info",
  className = "",
}: AlertProps) {
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm ${styles[variant]} ${className}`.trim()}
    >
      {children}
    </p>
  );
}
