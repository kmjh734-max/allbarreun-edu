import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isValidUsername,
  normalizeUsername,
  toInternalEmail,
} from "@/lib/auth/username";
import type { UserRole } from "@/types/database";

const PROFILE_SELECT =
  "id, name, email, role, username, is_active, created_by, created_at";

const ROLE_LABEL: Record<"student" | "teacher", string> = {
  student: "학생",
  teacher: "강사",
};

export type ManagedAccountRole = Extract<UserRole, "student" | "teacher">;

export interface CreateAccountInput {
  name: string;
  username: string;
  password: string;
  role: ManagedAccountRole;
  createdBy?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  username?: string;
  is_active?: boolean;
  allowUsernameChange: boolean;
  /** 설정 시 해당 생성자의 학생만 수정 가능 (강사용) */
  restrictToCreatorId?: string;
}

export interface ResetPasswordOptions {
  restrictToCreatorId?: string;
}

type Result<T> =
  | { ok: true; message: string; profile: T }
  | { ok: false; message: string; status: number };

export async function createManagedAccount(
  admin: SupabaseClient,
  input: CreateAccountInput
): Promise<Result<Record<string, unknown>>> {
  const label = ROLE_LABEL[input.role];
  const name = input.name.trim();
  const username = normalizeUsername(input.username);
  const password = input.password;

  if (!name) {
    return { ok: false, message: `${label} 이름을 입력해 주세요.`, status: 400 };
  }

  if (!username) {
    return {
      ok: false,
      message:
        "아이디는 영문 소문자·숫자만 사용할 수 있습니다. (한글·특수문자는 사용할 수 없습니다.)",
      status: 400,
    };
  }

  if (!isValidUsername(username)) {
    return {
      ok: false,
      message: "아이디는 영문 소문자·숫자 3~32자로 입력해 주세요.",
      status: 400,
    };
  }

  if (password.length < 6) {
    return {
      ok: false,
      message: "비밀번호는 6자 이상이어야 합니다.",
      status: 400,
    };
  }

  const internalEmail = toInternalEmail(username);

  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return {
      ok: false,
      message: "이미 사용 중인 아이디입니다.",
      status: 409,
    };
  }

  const { data: existingEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("email", internalEmail)
    .maybeSingle();

  if (existingEmail) {
    return {
      ok: false,
      message: "이미 등록된 로그인 정보입니다.",
      status: 409,
    };
  }

  const metadata: Record<string, string> = {
    name,
    role: input.role,
    username,
  };
  if (input.createdBy) {
    metadata.created_by = input.createdBy;
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        ok: false,
        message: "이미 등록된 로그인 정보입니다.",
        status: 409,
      };
    }
    return { ok: false, message: authError.message, status: 400 };
  }

  if (!authData?.user) {
    return { ok: false, message: "계정 생성에 실패했습니다.", status: 400 };
  }

  const userId = authData.user.id;
  const profilePayload = {
    name,
    email: internalEmail,
    role: input.role,
    username,
    is_active: true,
    created_by: input.createdBy ?? null,
  };

  // on_auth_user_created 트리거가 먼저 profiles 행을 만듦 → upsert 대신 update 후 없으면 insert
  const { data: updatedRows, error: updateError } = await admin
    .from("profiles")
    .update(profilePayload)
    .eq("id", userId)
    .select(PROFILE_SELECT);

  if (updateError) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (rollbackError) {
      console.error("[createManagedAccount] rollback failed:", rollbackError);
    }
    return { ok: false, message: updateError.message, status: 500 };
  }

  let profile = updatedRows?.[0] ?? null;

  if (!profile) {
    const { data: inserted, error: insertError } = await admin
      .from("profiles")
      .insert({ id: userId, ...profilePayload })
      .select(PROFILE_SELECT)
      .single();

    if (insertError) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (rollbackError) {
        console.error("[createManagedAccount] rollback failed:", rollbackError);
      }
      const hint =
        insertError.message.includes("created_by") ||
        insertError.message.includes("username") ||
        insertError.message.includes("is_active")
          ? " DB 마이그레이션(004~005)이 적용됐는지 Supabase SQL Editor에서 확인해 주세요."
          : "";
      return {
        ok: false,
        message: insertError.message + hint,
        status: 500,
      };
    }
    profile = inserted;
  }

  if (!profile) {
    return {
      ok: false,
      message: "프로필 저장 후 데이터를 불러오지 못했습니다.",
      status: 500,
    };
  }

  if (profile.role !== input.role) {
    const { data: fixed, error: roleFixError } = await admin
      .from("profiles")
      .update({ role: input.role })
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .single();

    if (roleFixError) {
      return { ok: false, message: roleFixError.message, status: 500 };
    }
    if (fixed) profile = fixed;
  }

  return {
    ok: true,
    message: `${label} 계정이 생성되었습니다.`,
    profile: profile as Record<string, unknown>,
  };
}

export async function updateManagedAccount(
  admin: SupabaseClient,
  id: string,
  role: ManagedAccountRole,
  input: UpdateAccountInput
): Promise<Result<Record<string, unknown>>> {
  const label = ROLE_LABEL[role];

  let fetchQuery = admin
    .from("profiles")
    .select("id, name, email, role, username, is_active, created_by")
    .eq("id", id)
    .eq("role", role);

  if (input.restrictToCreatorId) {
    fetchQuery = fetchQuery.eq("created_by", input.restrictToCreatorId);
  }

  const { data: current, error: fetchError } = await fetchQuery.single();

  if (fetchError || !current) {
    return {
      ok: false,
      message: `${label}을(를) 찾을 수 없습니다.`,
      status: 404,
    };
  }

  const updates: {
    name?: string;
    username?: string;
    email?: string;
    is_active?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { ok: false, message: "이름을 입력해 주세요.", status: 400 };
    }
    updates.name = name;
  }

  if (input.is_active !== undefined) {
    updates.is_active = input.is_active;
  }

  if (input.allowUsernameChange && input.username !== undefined) {
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) {
      return {
        ok: false,
        message: "아이디는 영문 소문자·숫자 3~32자로 입력해 주세요.",
        status: 400,
      };
    }

    if (username !== current.username) {
      const { data: taken } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", id)
        .maybeSingle();

      if (taken) {
        return {
          ok: false,
          message: "이미 사용 중인 아이디입니다.",
          status: 409,
        };
      }

      const newEmail = toInternalEmail(username);
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(
        id,
        { email: newEmail }
      );

      if (authUpdateError) {
        return { ok: false, message: authUpdateError.message, status: 400 };
      }

      updates.username = username;
      updates.email = newEmail;
    }
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: true,
      message: "변경 사항이 없습니다.",
      profile: current as Record<string, unknown>,
    };
  }

  const { data: profile, error: updateError } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(PROFILE_SELECT)
    .single();

  if (updateError) {
    return { ok: false, message: updateError.message, status: 500 };
  }

  const message =
    updates.is_active === false
      ? "계정이 비활성화되었습니다."
      : updates.is_active === true
        ? "계정이 활성화되었습니다."
        : "저장되었습니다.";

  return {
    ok: true,
    message,
    profile: (profile ?? current) as Record<string, unknown>,
  };
}

export async function resetManagedAccountPassword(
  admin: SupabaseClient,
  id: string,
  role: ManagedAccountRole,
  password: string,
  options?: ResetPasswordOptions
): Promise<Result<null>> {
  const label = ROLE_LABEL[role];

  if (password.length < 6) {
    return {
      ok: false,
      message: "비밀번호는 6자 이상이어야 합니다.",
      status: 400,
    };
  }

  let accountQuery = admin
    .from("profiles")
    .select("id, role, created_by")
    .eq("id", id)
    .eq("role", role);

  if (options?.restrictToCreatorId) {
    accountQuery = accountQuery.eq("created_by", options.restrictToCreatorId);
  }

  const { data: account } = await accountQuery.single();

  if (!account) {
    return {
      ok: false,
      message: `${label}을(를) 찾을 수 없습니다.`,
      status: 404,
    };
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });

  if (error) {
    return { ok: false, message: error.message, status: 400 };
  }

  return {
    ok: true,
    message: "비밀번호가 변경되었습니다.",
    profile: null,
  };
}
