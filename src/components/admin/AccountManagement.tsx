"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { academyConfig } from "@/config/academy";
import { parseAdminApiResponse } from "@/lib/admin/parse-api-response-client";
import { formatInternalEmailHint } from "@/lib/auth/username";
import { SearchableTreePicker } from "@/components/ui/SearchableTreePicker";
import { matchesSearch } from "@/lib/ui/filter-by-search";
import type { TreeNode } from "@/lib/ui/tree-types";
import type { Profile } from "@/types/database";

export interface TeacherCourseInfo {
  count: number;
  titles: string[];
}

interface AccountManagementProps {
  roleLabel: string;
  apiBasePath: string;
  users: Profile[];
  allowUsernameEdit: boolean;
  /** 강사 등: 계정 완전 삭제 (관리자 전용 API DELETE) */
  allowDelete?: boolean;
  courseInfoByUserId?: Record<string, TeacherCourseInfo>;
  /** 명단 테이블 위 검색 (이름·아이디·이메일) */
  showListSearch?: boolean;
  listSearchPlaceholder?: string;
  /** 반·학생 트리로 명단 필터 */
  listFilterTree?: TreeNode[];
  listFilterLabel?: string;
}

type Message = { type: "success" | "error"; text: string } | null;

export function AccountManagement({
  roleLabel,
  apiBasePath,
  users: initialUsers,
  allowUsernameEdit,
  allowDelete = false,
  courseInfoByUserId,
  showListSearch = false,
  listSearchPlaceholder = "이름·아이디로 검색",
  listFilterTree,
  listFilterLabel = "반·학생으로 찾기",
}: AccountManagementProps) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [treeFilterIds, setTreeFilterIds] = useState<string[] | null>(null);

  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const showCourses = Boolean(courseInfoByUserId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: createName,
          username: createUsername,
          password: createPassword,
        }),
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text:
            data.message ??
            `요청 실패 (${res.status}${res.statusText ? ` ${res.statusText}` : ""})`,
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.message ?? `${roleLabel} 계정이 생성되었습니다.`,
      });
      setCreateName("");
      setCreateUsername("");
      setCreatePassword("");
      router.refresh();
    } catch (fetchError) {
      console.error("handleCreate fetch error:", fetchError);
      setMessage({
        type: "error",
        text:
          fetchError instanceof Error
            ? fetchError.message
            : "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: Profile) {
    setEditingId(user.id);
    setEditName(user.name);
    setEditUsername(user.username ?? "");
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditUsername("");
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    setMessage(null);

    try {
      const body: { name: string; username?: string } = { name: editName };
      if (allowUsernameEdit) {
        body.username = editUsername;
      }

      const res = await fetch(`${apiBasePath}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "저장에 실패했습니다.",
        });
        return;
      }

      setMessage({ type: "success", text: data.message ?? "저장되었습니다." });
      cancelEdit();
      router.refresh();
    } catch (fetchError) {
      console.error("handleSaveEdit error:", fetchError);
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user: Profile) {
    const courseInfo = courseInfoByUserId?.[user.id];
    const courseNote =
      courseInfo && courseInfo.count > 0
        ? `\n담당 강좌 ${courseInfo.count}개는 강사 미배정 상태가 됩니다.`
        : "";
    const studentNote =
      roleLabel === "학생"
        ? "\n학생 계정과 수강·학습 기록이 함께 삭제됩니다."
        : "";
    const adminNote =
      roleLabel === "관리자"
        ? "\n마지막 남은 관리자 계정은 삭제할 수 없습니다."
        : "";

    if (
      !window.confirm(
        `「${user.name}」 ${roleLabel} 계정을 완전히 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.${courseNote}${studentNote}${adminNote}`
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiBasePath}/${user.id}`, {
        method: "DELETE",
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "삭제에 실패했습니다.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.message ?? `${roleLabel} 계정이 삭제되었습니다.`,
      });
      if (editingId === user.id) cancelEdit();
      if (resetId === user.id) {
        setResetId(null);
        setResetPassword("");
      }
      router.refresh();
    } catch (fetchError) {
      console.error("handleDelete error:", fetchError);
      setMessage({ type: "error", text: "삭제 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user: Profile) {
    const nextActive = !user.is_active;
    const confirmMsg = nextActive
      ? `이 ${roleLabel} 계정을 다시 활성화할까요?`
      : `이 ${roleLabel} 계정을 비활성화할까요? 로그인할 수 없게 됩니다.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiBasePath}/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "상태 변경에 실패했습니다.",
        });
        return;
      }

      setMessage({ type: "success", text: data.message ?? "저장되었습니다." });
      router.refresh();
    } catch (fetchError) {
      console.error("handleToggleActive error:", fetchError);
      setMessage({ type: "error", text: "상태 변경 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetId) return;

    if (
      !window.confirm(
        `선택한 ${roleLabel}의 비밀번호를 변경합니다. 계속할까요?`
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${apiBasePath}/${resetId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await parseAdminApiResponse(res);

      if (!res.ok || !data.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "비밀번호 변경에 실패했습니다.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: data.message ?? "비밀번호가 변경되었습니다.",
      });
      setResetId(null);
      setResetPassword("");
    } catch (fetchError) {
      console.error("handleResetPassword error:", fetchError);
      setMessage({ type: "error", text: "비밀번호 변경 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  }

  const colSpan = showCourses ? 5 : 4;

  const filteredUsers = useMemo(() => {
    let list = initialUsers;
    if (treeFilterIds && treeFilterIds.length > 0) {
      const idSet = new Set(treeFilterIds);
      list = list.filter((user) => idSet.has(user.id));
    }
    if (showListSearch && listQuery.trim()) {
      list = list.filter((user) =>
        matchesSearch(
          listQuery,
          user.name,
          user.username,
          user.email,
          formatInternalEmailHint(user.username)
        )
      );
    }
    return list;
  }, [initialUsers, listQuery, showListSearch, treeFilterIds]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">새 {roleLabel} 등록</h3>
        <p className="mt-1 text-sm text-slate-600">
          {roleLabel}는 아이디와 비밀번호로 로그인합니다. (내부: 아이디@
          {academyConfig.internalEmailDomain})
        </p>

        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {roleLabel} 이름
            </label>
            <input
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              로그인 아이디
            </label>
            <input
              required
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-500">
              영문 소문자·숫자 3~32자
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              초기 비밀번호
            </label>
            <input
              required
              type="password"
              minLength={6}
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoComplete="new-password"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "등록 중..." : `${roleLabel} 등록`}
            </button>
          </div>
        </form>
      </div>

      {message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}

      {(showListSearch || listFilterTree) && initialUsers.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {listFilterTree && listFilterTree.length > 0 && (
            <div className="w-full max-w-md">
              <SearchableTreePicker
                label={listFilterLabel}
                tree={listFilterTree}
                value=""
                onChange={() => {}}
                filterMode
                onFilterChange={setTreeFilterIds}
                searchPlaceholder="반·학생 이름 검색"
                emptyLabel="전체 학생"
              />
            </div>
          )}
          {showListSearch && (
            <div className="w-full max-w-md">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                텍스트 검색
              </label>
              <input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder={listSearchPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table
          className={`w-full text-left text-sm ${
            allowDelete ? "min-w-[1040px]" : "min-w-[880px]"
          }`}
        >
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">아이디</th>
              {showCourses && (
                <th className="px-4 py-3 font-medium">담당 강좌</th>
              )}
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  등록된 {roleLabel}이(가) 없습니다.
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isEditing = editingId === user.id;
                const internalHint = formatInternalEmailHint(user.username);
                const courses = courseInfoByUserId?.[user.id];

                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      !user.is_active ? "bg-slate-50/80" : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full min-w-[120px] rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium">{user.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isEditing && allowUsernameEdit ? (
                        <input
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full min-w-[120px] rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <div>
                          <span className="font-mono text-slate-800">
                            {user.username ?? "—"}
                          </span>
                          {internalHint && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {internalHint}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {showCourses && (
                      <td className="px-4 py-3 align-top text-slate-700">
                        {courses && courses.count > 0 ? (
                          <div>
                            <span className="font-medium text-brand-700">
                              {courses.count}개
                            </span>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                              {courses.titles.join(", ")}
                              {courses.count > courses.titles.length
                                ? " …"
                                : ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">없음</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {user.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="min-w-[240px] px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleSaveEdit(user.id)}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              수정
                            </button>
                            {allowDelete && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDelete(user)}
                                className="rounded-lg border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                              >
                                삭제
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setResetId(user.id);
                                setResetPassword("");
                                setMessage(null);
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              비밀번호 초기화
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleToggleActive(user)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                                user.is_active
                                  ? "border border-amber-300 text-amber-800 hover:bg-amber-50"
                                  : "border border-green-300 text-green-800 hover:bg-green-50"
                              }`}
                            >
                              {user.is_active ? "비활성화" : "활성화"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold">비밀번호 초기화</h3>
            <p className="mt-1 text-sm text-slate-600">
              새 비밀번호를 입력하면 즉시 적용됩니다.
            </p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <input
                required
                type="password"
                minLength={6}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="새 비밀번호 (6자 이상)"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetId(null);
                    setResetPassword("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
