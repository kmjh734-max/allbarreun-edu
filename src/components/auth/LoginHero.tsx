import { BrandLogo } from "@/components/branding/BrandLogo";
import { ACADEMY_MOTTO, LOGIN_TAGLINE, SITE_NAME } from "@/lib/branding";

interface LoginHeroProps {
  compact?: boolean;
}

function HeroLogo({ large = false }: { large?: boolean }) {
  return (
    <BrandLogo
      variant="login"
      showSiteName={false}
      large={large}
      className="mx-auto"
    />
  );
}

export function LoginHero({ compact = false }: LoginHeroProps) {
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-brand-900 via-slate-950 to-black px-6 py-8 text-white lg:hidden">
        <HeroLogo />
        <p className="mt-4 text-center text-xs font-medium tracking-wide text-brand-100/90">
          {SITE_NAME}
        </p>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-300">
          {LOGIN_TAGLINE}
        </p>
      </div>
    );
  }

  return (
    <aside className="relative hidden min-h-screen w-[44%] max-w-[560px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-900 via-[#0f172a] to-black px-10 py-12 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(227,6,19,0.2),transparent_60%)]"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <HeroLogo large />
        <p className="mt-6 text-lg font-semibold text-white">{SITE_NAME}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {LOGIN_TAGLINE}
        </p>
        <p className="mt-8 text-sm font-medium text-brand-100/90">
          {ACADEMY_MOTTO}
        </p>
      </div>
    </aside>
  );
}
