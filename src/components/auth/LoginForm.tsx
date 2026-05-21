"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/auth/username";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/database";

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "아이디(또는 이메일) 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다.";
  }
  if (lower.includes("too many requests")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  return message;
}

interface LoginFormProps {
  initialError?: string;
}

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const loginEmail = resolveLoginEmail(identifier);
    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (signInError) {
      setError(translateAuthError(signInError.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        setError(
          profile.role === "teacher"
            ? "비활성화된 계정입니다. 관리자에게 문의해 주세요."
            : "비활성화된 계정입니다. 학원에 문의해 주세요."
        );
        setLoading(false);
        return;
      }

      const role = profile?.role as UserRole | undefined;
      if (role) {
        router.push(getDashboardPathForRole(role));
        router.refresh();
        return;
      }
    }

    setError("프로필을 불러올 수 없습니다.");
    setLoading(false);
  }

  const isEmailStyle = identifier.includes("@");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="ui-label">
          {isEmailStyle ? "이메일" : "아이디"}
        </label>
        <input
          id="identifier"
          type="text"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="ui-input"
          placeholder={isEmailStyle ? "admin@example.com" : "아이디 입력"}
        />
      </div>
      <div>
        <label htmlFor="password" className="ui-label">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ui-input"
        />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <Button
        type="submit"
        variant="primary"
        disabled={loading}
        className="w-full py-2.5 text-[15px] font-semibold"
      >
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
