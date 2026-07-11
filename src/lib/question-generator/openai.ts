import {
  getListeningGeneratorModelCandidates,
  isGpt5FamilyModel,
  isListeningModelUnavailableError,
  isUnsupportedParameterError,
  isUnsupportedTemperatureError,
  LISTENING_GPT5_MAX_COMPLETION_TOKENS,
  listeningModelSupportsCustomTemperature,
} from "@/lib/listening/openai-listening-model";

function modelCandidates(): string[] {
  const dedicated = process.env.OPENAI_MODEL_QUESTION_GENERATOR?.trim();
  if (dedicated) {
    return [dedicated, ...getListeningGeneratorModelCandidates().filter((m) => m !== dedicated)];
  }
  return getListeningGeneratorModelCandidates();
}

type RequestProfile = {
  includeTemperature: boolean;
  includeJsonMode: boolean;
  includeReasoningEffort: boolean;
};

function defaultProfile(model: string): RequestProfile {
  const gpt5 = isGpt5FamilyModel(model);
  return {
    includeTemperature: listeningModelSupportsCustomTemperature(model),
    includeJsonMode: true,
    includeReasoningEffort: gpt5,
  };
}

function buildBody(
  model: string,
  system: string,
  user: string,
  temperature: number,
  maxTokens: number,
  profile: RequestProfile
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (profile.includeJsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (profile.includeTemperature) {
    body.temperature = temperature;
  }
  if (isGpt5FamilyModel(model)) {
    body.max_completion_tokens = Math.min(
      LISTENING_GPT5_MAX_COMPLETION_TOKENS,
      maxTokens
    );
    if (profile.includeReasoningEffort) {
      body.reasoning_effort = "low";
    }
  } else {
    body.max_tokens = Math.min(8192, maxTokens);
  }
  return body;
}

function relaxProfile(
  model: string,
  profile: RequestProfile,
  bodyText: string
): RequestProfile | null {
  const next = { ...profile };
  let changed = false;
  if (next.includeTemperature && isUnsupportedTemperatureError(bodyText)) {
    next.includeTemperature = false;
    changed = true;
  }
  if (
    next.includeJsonMode &&
    isUnsupportedParameterError(bodyText, "response_format")
  ) {
    next.includeJsonMode = false;
    changed = true;
  }
  if (
    next.includeReasoningEffort &&
    isUnsupportedParameterError(bodyText, "reasoning_effort")
  ) {
    next.includeReasoningEffort = false;
    changed = true;
  }
  return changed ? next : null;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("JSON 파싱에 실패했습니다.");
  }
}

export async function questionGeneratorChatJson(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const temperature = opts.temperature ?? 0.35;
  const maxTokens = opts.maxTokens ?? 4096;
  let lastError = "AI 요청에 실패했습니다.";

  for (const model of modelCandidates()) {
    let profile = defaultProfile(model);
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildBody(model, opts.system, opts.user, temperature, maxTokens, profile)
        ),
      });
      const bodyText = await res.text();
      if (!res.ok) {
        if (isListeningModelUnavailableError(res.status, bodyText)) {
          lastError = `모델 ${model}을(를) 사용할 수 없습니다.`;
          break;
        }
        const relaxed = relaxProfile(model, profile, bodyText);
        if (relaxed) {
          profile = relaxed;
          continue;
        }
        lastError = `AI 요청 실패 (${res.status})`;
        break;
      }
      let parsed: { choices?: Array<{ message?: { content?: string } }> };
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        lastError = "AI 응답을 해석하지 못했습니다.";
        continue;
      }
      const content = parsed.choices?.[0]?.message?.content;
      if (!content) {
        lastError = "AI 응답이 비어 있습니다.";
        continue;
      }
      try {
        return extractJsonObject(content);
      } catch {
        lastError = "AI JSON 파싱에 실패했습니다.";
        continue;
      }
    }
  }

  throw new Error(lastError);
}

export async function questionGeneratorChatJsonWithRetry(
  opts: Parameters<typeof questionGeneratorChatJson>[0]
): Promise<unknown> {
  try {
    return await questionGeneratorChatJson(opts);
  } catch {
    return questionGeneratorChatJson(opts);
  }
}
