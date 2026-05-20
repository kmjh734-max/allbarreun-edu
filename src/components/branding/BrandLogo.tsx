import Image from "next/image";
import { LOGO_SRC, SITE_NAME } from "@/lib/branding";

type BrandLogoVariant = "login" | "header";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showSiteName?: boolean;
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
  className = "",
}: BrandLogoProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`${styles.wrap} ${className}`.trim()}>
      <Image
        src={LOGO_SRC}
        alt={SITE_NAME}
        width={200}
        height={56}
        priority={variant === "login"}
        className={`object-contain object-left ${styles.image}`}
        sizes="140px"
      />
      {showSiteName && (
        <span className={styles.name}>{SITE_NAME}</span>
      )}
    </div>
  );
}
