import Image from "next/image";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { academyConfig } from "@/config/academy";
import {
  ACADEMY_MOTTO,
  DIRECTOR_CAPTION,
  DIRECTOR_IMAGE_SRC,
  SITE_NAME,
} from "@/lib/branding";

interface LoginHeroProps {
  compact?: boolean;
}

function DirectorPortrait({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`.trim()}>
      <div className="overflow-hidden rounded-t-2xl bg-white shadow-[0_12px_40px_rgb(0_0_0/0.35)]">
        <Image
          src={DIRECTOR_IMAGE_SRC}
          alt={`${academyConfig.academyName} 소개`}
          width={520}
          height={780}
          priority
          unoptimized
          className="block max-h-[min(58vh,640px)] w-auto object-contain"
          sizes="(max-width: 1024px) 45vw, 480px"
        />
      </div>
      <p className="mt-3 text-center text-sm tracking-wide text-slate-300">
        {DIRECTOR_CAPTION}
      </p>
    </div>
  );
}

export function LoginHero({ compact = false }: LoginHeroProps) {
  if (compact) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-slate-950 to-black px-6 py-8 text-white">
        <div className="relative z-10 max-w-[55%]">
          <BrandLogo variant="login" showSiteName={false} onDark />
          <p className="mt-4 text-xs font-medium tracking-wide text-brand-100/90">
            {SITE_NAME}
          </p>
          <p className="mt-3 text-base font-semibold leading-snug text-white">
            {ACADEMY_MOTTO}
          </p>
          <p className="mt-4 text-xs tracking-wide text-slate-400">
            {DIRECTOR_CAPTION}
          </p>
        </div>
        <div
          className="pointer-events-none absolute -right-4 bottom-0 w-[48%] max-w-[200px]"
          aria-hidden
        >
          <div className="overflow-hidden rounded-t-xl bg-white shadow-lg">
            <Image
              src={DIRECTOR_IMAGE_SRC}
              alt=""
              width={320}
              height={480}
              unoptimized
              className="block h-auto w-full object-contain"
              priority
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="relative hidden min-h-screen w-[44%] max-w-[560px] flex-col overflow-hidden bg-gradient-to-br from-brand-900 via-[#0f172a] to-black lg:flex">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(47,95,143,0.35),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col px-10 pt-12 xl:px-14 xl:pt-16">
        <BrandLogo variant="login" showSiteName onDark className="items-start" />
        <div className="mt-14 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200/80">
            Philosophy
          </p>
          <blockquote className="mt-4 border-l-2 border-brand-400/60 pl-5">
            <p className="text-2xl font-semibold leading-snug tracking-tight text-white xl:text-[1.65rem]">
              아는 것은
              <br />
              <span className="text-brand-100">더 철저하고 완벽하게</span>
              <br />
              더 깊이있게!
            </p>
          </blockquote>
          <p className="mt-6 text-sm leading-relaxed text-slate-400">
            {academyConfig.academyName}이 지향하는 학습의 방향입니다.
          </p>
        </div>
      </div>

      <div className="relative mt-auto flex flex-1 items-end justify-center px-6 pb-10 pt-8">
        <DirectorPortrait />
      </div>
    </aside>
  );
}
