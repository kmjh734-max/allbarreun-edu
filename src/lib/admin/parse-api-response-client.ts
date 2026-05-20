export async function parseAdminApiResponse(res: Response) {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false as const,
      message: "서버 응답이 비어 있습니다.",
    };
  }
  try {
    return JSON.parse(text) as {
      ok?: boolean;
      message?: string;
      student?: unknown;
      teacher?: unknown;
      profile?: unknown;
    };
  } catch (parseError) {
    console.error("API JSON parse failed:", parseError, "raw:", text);
    return {
      ok: false as const,
      message: "서버 응답을 해석할 수 없습니다.",
    };
  }
}
