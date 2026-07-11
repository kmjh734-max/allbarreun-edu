import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { openAiErrorMessage } from "@/lib/vocab/openai-error-message";

interface RequestItem {
  word: string;
  meaning: string;
}

interface GeneratedItem extends RequestItem {
  synonyms: string;
  antonyms: string;
}

function jsonError(message: string, status = 200) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "admin" && profile.role !== "teacher")) {
      return jsonError("권한이 없습니다.", 403);
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return jsonError(
        "OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local에 키를 추가한 뒤 개발 서버를 재시작해 주세요."
      );
    }

    const body = (await request.json()) as {
      items?: RequestItem[];
      kind?: "synonyms" | "antonyms" | "both";
    };
    const kind = body.kind ?? "both";
    const items = (body.items ?? []).filter(
      (i) => i.word?.trim() && i.meaning?.trim()
    );

    if (items.length === 0) {
      return jsonError("생성할 단어가 없습니다.");
    }

    const fieldGuide =
      kind === "synonyms"
        ? `For each word, provide 2–4 English synonyms (comma-separated). Leave antonyms as empty string.`
        : kind === "antonyms"
          ? `For each word, provide 2–4 English antonyms (comma-separated). Leave synonyms as empty string.`
          : `For each word, provide 2–4 English synonyms and 2–4 English antonyms (each comma-separated).`;

    const prompt = `You are an English vocabulary teacher for Korean students.

${fieldGuide}
Use words appropriate for middle/high school learners. Do not include inappropriate content.

Return ONLY valid JSON in this exact shape (no markdown):
{
  "items": [
    {
      "word": "exact word from input",
      "meaning": "exact meaning from input",
      "synonyms": "synonym1, synonym2",
      "antonyms": "antonym1, antonym2"
    }
  ]
}

Words to process:
${JSON.stringify(items.map((i) => ({ word: i.word.trim(), meaning: i.meaning.trim() })))}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You output only valid JSON. Never include markdown fences or extra text.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error", response.status, errText);
      return jsonError(openAiErrorMessage(response.status, errText));
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return jsonError("AI 생성에 실패했습니다.");
    }

    let parsed: { items?: GeneratedItem[] };
    try {
      parsed = JSON.parse(content) as { items?: GeneratedItem[] };
    } catch {
      return jsonError("AI 응답을 해석하지 못했습니다.");
    }

    const generated = parsed.items ?? [];
    if (generated.length === 0) {
      return jsonError("AI가 결과를 반환하지 않았습니다. 다시 시도해 주세요.");
    }

    const byWord = new Map(
      generated.map((g) => [g.word.trim().toLowerCase(), g])
    );

    const result: GeneratedItem[] = items.map((item) => {
      const match = byWord.get(item.word.trim().toLowerCase());
      return {
        word: item.word.trim(),
        meaning: item.meaning.trim(),
        synonyms: match?.synonyms?.trim() ?? "",
        antonyms: match?.antonyms?.trim() ?? "",
      };
    });

    const filled = result.filter((r) =>
      kind === "synonyms"
        ? r.synonyms
        : kind === "antonyms"
          ? r.antonyms
          : r.synonyms || r.antonyms
    );
    if (filled.length === 0) {
      return jsonError("생성된 내용이 비어 있습니다. 다시 시도해 주세요.");
    }

    return NextResponse.json({ ok: true, items: result, kind });
  } catch (err) {
    console.error("generate-related-words error", err);
    return jsonError("AI 생성에 실패했습니다.");
  }
}
