import { BrandLogo } from "@/components/branding/BrandLogo";
import { LoginForm } from "@/components/auth/LoginForm";
import { SITE_NAME, LOGIN_TAGLINE } from "@/lib/branding";

interface PageProps {
  searchParams: Promise<{ inactive?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { inactive } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="mb-8 text-center">
          <BrandLogo variant="login" className="mx-auto" />
          <p className="mt-4 text-sm text-slate-600">{LOGIN_TAGLINE}</p>
        </div>
        <LoginForm
          initialError={
            inactive
              ? "비활성화된 계정입니다. 학원에 문의해 주세요."
              : undefined
          }
        />
        <p className="mt-6 text-center text-xs text-slate-400">{SITE_NAME}</p>
      </div>
    </div>
  );
}
