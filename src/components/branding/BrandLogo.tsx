import Image from "next/image";
import { LOGO_SRC, SITE_NAME } from "@/lib/branding";

type BrandLogoVariant = "login" | "header";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  showSiteName?: boolean;
  /** 로그인 히어로 등 큰 로고 */
  large?: boolean;
  className?: string;
}

const variantStyles: Record<
  BrandLogoVariant,
  { image: string; name: string; wrap: string }
> = {
  login: {
    wrap: "flex flex-col items-center gap-2",
    image: "h-12 w-auto max-w-[220px]",
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
  large = false,
  className = "",
}: BrandLogoProps) {
  const styles = variantStyles[variant];
  const imageClass = large
    ? "h-20 w-auto max-w-[320px] sm:h-24"
    : styles.image;

  const image = (
    <Image
      src={LOGO_SRC}
      alt={SITE_NAME}
      width={320}
      height={90}
      priority={variant === "login"}
      unoptimized={variant === "login"}
      className={`object-contain object-center ${imageClass}`}
      sizes="(max-width: 320px) 80vw, 320px"
    />
  );

  const logoImage =
    variant === "login" ? (
      <div className="rounded-xl bg-white px-5 py-4 shadow-[0_4px_20px_rgb(0_0_0/0.12)]">
        {image}
      </div>
    ) : (
      image
    );

  return (
    <div className={`${styles.wrap} ${className}`.trim()}>
      {logoImage}
      {showSiteName && (
        <span className={styles.name}>{SITE_NAME}</span>
      )}
    </div>
  );
}
