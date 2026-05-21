import Image from "next/image";
import { LOGO_SRC, SITE_NAME } from "@/lib/branding";

type BrandLogoVariant = "login" | "header";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showSiteName?: boolean;
  /** 어두운 배경: 흰 카드 안에 컬러 로고 표시 */
  onDark?: boolean;
  className?: string;
}

const variantStyles: Record<
  BrandLogoVariant,
  { image: string; name: string; wrap: string }
> = {
  login: {
    wrap: "flex flex-col items-center gap-2",
    image: "h-12 w-auto max-w-[200px]",
    name: "text-lg font-semibold text-brand-900",
  },
  header: {
    wrap: "flex min-w-0 items-center gap-2.5",
    image: "h-8 w-auto max-w-[120px] sm:max-w-[140px]",
    name: "truncate text-sm font-semibold text-slate-900 sm:text-[15px]",
  },
};

export function BrandLogo({
  variant = "header",
  showSiteName = true,
  onDark = false,
  className = "",
}: BrandLogoProps) {
  const styles = variantStyles[variant];

  const content = (
    <>
      <Image
        src={LOGO_SRC}
        alt={SITE_NAME}
        width={200}
        height={56}
        priority={variant === "login"}
        unoptimized={variant === "login"}
        className={`object-contain object-left ${styles.image}`}
        sizes="200px"
      />
      {showSiteName && (
        <span
          className={
            onDark ? "text-lg font-semibold text-brand-900" : styles.name
          }
        >
          {SITE_NAME}
        </span>
      )}
    </>
  );

  if (onDark) {
    return (
      <div
        className={`inline-flex rounded-xl bg-white px-4 py-3 shadow-[0_8px_24px_rgb(0_0_0/0.25)] ${className}`.trim()}
      >
        <div className={styles.wrap}>{content}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${className}`.trim()}>{content}</div>
  );
}
