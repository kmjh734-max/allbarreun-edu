"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  GRADES,
  MAX_PASSAGES,
  MAX_SETS_PER_TYPE,
  MAX_TOTAL_QUESTIONS,
  OVERALL_DIFFICULTIES,
  SOURCE_TYPES,
} from "@/lib/question-generator/constants";
import { emptyPassageInput } from "@/lib/question-generator/passages";
import {
  emptyCounts,
  QUESTION_TYPE_GROUPS,
  sanitizeCounts,
  sumCounts,
} from "@/lib/question-generator/question-types";
import type {
  GenerationRequestConfig,
  PassageInput,
} from "@/lib/question-generator/types";

type Role = "admin" | "teacher";

interface PresetRow {
  id: string;
  name: string;
  description: string | null;
  config: { counts?: Record<string, number> };
  is_system: boolean;
  slug?: string | null;
}

const CATEGORY_ORDER = [
  "main_idea",
  "details",
  "inference",
  "grammar_vocabulary",
  "subjective",
] as const;

export function QuestionGeneratorClient({
  role,
  basePath,
}: {
  role: Role;
  basePath: string;
}) {
  const [title, setTitle] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("고1");
  const [sourceType, setSourceType] = useState("모의고사");
  const [sourceDetail, setSourceDetail] = useState("");
  const [overallDifficulty, setOverallDifficulty] = useState("내신");
  const [passages, setPassages] = useState<PassageInput[]>([
    emptyPassageInput(),
  ]);
  const [counts, setCounts] = useState<Record<string, number>>(emptyCounts);
  const [modeTab, setModeTab] = useState<string>("custom");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    main_idea: true,
    details: true,
    inference: true,
    grammar_vocabulary: true,
    subjective: true,
  });
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [passageId, setPassageId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetDesc, setPresetDesc] = useState("");
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [jobProgress, setJobProgress] = useState<{
    jobId: string;
    status: string;
    message: string;
    completed: number;
    total: number;
    failed: number;
    done?: boolean;
  } | null>(null);
  const pdfOpenedForJob = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const fromJobId = searchParams.get("fromJob");
  const fromJobLoaded = useRef(false);
  const skipDirtyOnce = useRef(false);

  const filledPassages = useMemo(
    () => passages.filter((p) => p.text.trim()),
    [passages]
  );
  const perPassageTotals = useMemo(() => sumCounts(counts), [counts]);
  const grandTotal = perPassageTotals.total * Math.max(1, filledPassages.length);

  const config: GenerationRequestConfig = useMemo(
    () => ({
      title,
      schoolName,
      grade,
      sourceType,
      sourceDetail,
      overallDifficulty,
      passage: filledPassages[0]?.text ?? "",
      passages,
      mode: modeTab === "custom" ? "custom" : "preset",
      presetId: modeTab.startsWith("preset:") ? modeTab.slice(7) : null,
      counts,
    }),
    [
      title,
      schoolName,
      grade,
      sourceType,
      sourceDetail,
      overallDifficulty,
      passages,
      filledPassages,
      modeTab,
      counts,
    ]
  );

  useEffect(() => {
    fetch("/api/question-generator/presets")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPresets(d.presets ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!fromJobId || fromJobLoaded.current) return;
    fromJobLoaded.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/question-generator/jobs/${fromJobId}`);
        const d = await res.json();
        if (!d.ok || cancelled) {
          if (!cancelled) setError(d.message ?? "자료를 불러오지 못했습니다.");
          return;
        }
        const cfg = (d.job?.request_config ?? {}) as GenerationRequestConfig;
        setTitle((cfg.title ?? "").trim() || "");
        setSchoolName(cfg.schoolName ?? "");
        setGrade(cfg.grade || "고1");
        setSourceType(cfg.sourceType || "모의고사");
        setSourceDetail(cfg.sourceDetail ?? "");
        setOverallDifficulty(cfg.overallDifficulty || "내신");
        setCounts(sanitizeCounts(cfg.counts, MAX_SETS_PER_TYPE));
        if (cfg.presetId) setModeTab(`preset:${cfg.presetId}`);
        else setModeTab("custom");

        const list = Array.isArray(cfg.passages) ? cfg.passages : [];
        const loaded: PassageInput[] = list
          .map((p) => ({
            clientId: p.clientId || emptyPassageInput().clientId,
            title: p.title ?? "",
            sourceDetail: p.sourceDetail ?? "",
            text: (p.text ?? "").trim(),
          }))
          .filter((p) => p.text);
        if (loaded.length === 0 && (cfg.passage ?? "").trim()) {
          loaded.push({
            ...emptyPassageInput(),
            text: cfg.passage.trim(),
            title: cfg.title ?? "",
            sourceDetail: cfg.sourceDetail ?? "",
          });
        }
        setPassages(loaded.length > 0 ? loaded : [emptyPassageInput()]);
        skipDirtyOnce.current = true;
        setDirty(false);
        setMessage(
          "복사한 자료의 지문·유형 설정을 불러왔습니다. 생성하면 이 자료에 바로 만들어집니다."
        );      } catch {
        if (!cancelled) setError("자료를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromJobId]);

  useEffect(() => {
    if (skipDirtyOnce.current) {
      skipDirtyOnce.current = false;
      return;
    }
    setDirty(true);
  }, [config]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (jobProgress && !jobProgress.done) return;
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, jobProgress]);

  const JOB_STORAGE_KEY = "qg-active-job";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(JOB_STORAGE_KEY);
      if (!raw || jobProgress) return;
      const saved = JSON.parse(raw) as { jobId: string; total: number };
      if (saved?.jobId) {
        setJobProgress({
          jobId: saved.jobId,
          status: "generating",
          message: "이어서 진행 상황 확인 중…",
          completed: 0,
          total: saved.total || 1,
          failed: 0,
        });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = useCallback(async () => {
    setMessage(null);
    setError(null);
    const res = await fetch("/api/question-generator/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passageId, config }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.message ?? "임시 저장 실패");
      return;
    }
    setPassageId(data.passageId);
    setSavedAt(data.savedAt);
    setDirty(false);
    setMessage("임시 저장되었습니다.");
  }, [passageId, config]);

  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => {
      void saveDraft();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [dirty, saveDraft]);

  function setCount(key: string, value: number) {
    const n = Math.max(0, Math.min(MAX_SETS_PER_TYPE, Math.floor(value || 0)));
    setCounts((prev) => ({ ...prev, [key]: n }));
  }

  function applyCounts(next: Record<string, number>) {
    setCounts(sanitizeCounts(next, MAX_SETS_PER_TYPE));
  }

  /** 프리셋 키들을 현재 값에 +n (클릭할 때마다 누적) */
  function addCounts(entries: Array<[string, number]>) {
    setCounts((prev) => {
      const next = { ...prev };
      for (const [key, add] of entries) {
        if (!(key in next)) continue;
        next[key] = Math.min(
          MAX_SETS_PER_TYPE,
          Math.max(0, (next[key] ?? 0) + add)
        );
      }
      return next;
    });
    setModeTab("custom");
  }

  function applyDbPreset(p: PresetRow) {
    applyCounts(p.config?.counts ?? {});
    setModeTab(`preset:${p.id}`);
  }

  function resetAll() {
    setCounts(emptyCounts());
    setModeTab("custom");
    setMessage(null);
    setError(null);
  }

  /** 한 카테고리(대의 파악 등) 세트만 0으로 */
  function resetCategory(keys: string[]) {
    setCounts((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (key in next) next[key] = 0;
      }
      return next;
    });
    setModeTab("custom");
  }

  function updatePassage(index: number, patch: Partial<PassageInput>) {
    setPassages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  }

  function addPassage() {
    if (passages.length >= MAX_PASSAGES) {
      setError(`지문은 최대 ${MAX_PASSAGES}개까지 넣을 수 있습니다.`);
      return;
    }
    setPassages((prev) => [...prev, emptyPassageInput()]);
  }

  function removePassage(index: number) {
    if (passages.length <= 1) return;
    setPassages((prev) => prev.filter((_, i) => i !== index));
  }

  async function savePreset() {
    if (!presetName.trim()) {
      setError("프리셋 이름을 입력해 주세요.");
      return;
    }
    const res = await fetch("/api/question-generator/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: presetName,
        description: presetDesc,
        config: { counts },
        isSystem: false,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.message ?? "프리셋 저장 실패");
      return;
    }
    setPresets((prev) => [data.preset, ...prev]);
    setShowPresetForm(false);
    setPresetName("");
    setPresetDesc("");
    setMessage("프리셋이 저장되었습니다.");
  }

  async function startGenerate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (perPassageTotals.total <= 0) {
        setError("생성할 문항을 1개 이상 선택해 주세요.");
        return;
      }
      if (filledPassages.length === 0) {
        setError("영어 지문을 1개 이상 입력해 주세요.");
        return;
      }
      if (grandTotal > MAX_TOTAL_QUESTIONS) {
        setError(
          `최대 ${MAX_TOTAL_QUESTIONS}문항까지 생성할 수 있습니다. (지문 ${filledPassages.length} × ${perPassageTotals.total} = ${grandTotal})`
        );
        return;
      }

      const res = await fetch("/api/question-generator/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          ...(fromJobId ? { reuseJobId: fromJobId } : {}),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "생성 요청 실패");
        return;
      }
      setDirty(false);
      pdfOpenedForJob.current = null;
      setJobProgress({
        jobId: data.jobId,
        status: "pending",
        message: data.reused
          ? "복사한 자료에서 생성 중…"
          : "생성 준비 중…",
        completed: 0,
        total: grandTotal,
        failed: 0,
      });
      try {
        sessionStorage.setItem(
          "qg-active-job",
          JSON.stringify({ jobId: data.jobId, total: grandTotal })
        );
      } catch {
        /* ignore */
      }
      void fetch(`/api/question-generator/jobs/${data.jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      if (fromJobId && data.reused) {
        setMessage("복사한 자료에 문항을 생성합니다.");
      }
    } catch {
      setError("생성 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function openPdfs(jobId: string) {
    // 같은 탭에서 문제 PDF로 이동 (새 창 금지). 해설지는 인쇄 화면 왼쪽에서 전환.
    window.location.assign(`${basePath}/generations/${jobId}/print?mode=exam`);
  }

  useEffect(() => {
    if (!jobProgress?.jobId || jobProgress.done) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/question-generator/jobs/${jobProgress.jobId}`
        );
        const data = await res.json();
        if (!data.ok || !data.job || cancelled) return;
        const job = data.job as {
          status: string;
          progress_message: string | null;
          total_completed: number;
          total_requested: number;
          total_failed: number;
          error_message: string | null;
        };
        const terminal = [
          "completed",
          "partially_completed",
          "failed",
        ].includes(job.status);

        setJobProgress({
          jobId: jobProgress.jobId,
          status: job.status,
          message:
            job.progress_message || (terminal ? "생성 완료" : "생성 중…"),
          completed: job.total_completed ?? 0,
          total: job.total_requested || jobProgress.total,
          failed: job.total_failed ?? 0,
          done: terminal,
        });

        if (terminal && pdfOpenedForJob.current !== jobProgress.jobId) {
          pdfOpenedForJob.current = jobProgress.jobId;
          try {
            sessionStorage.removeItem("qg-active-job");
          } catch {
            /* ignore */
          }
          if (job.status === "failed") {
            setError(job.error_message || "생성에 실패했습니다.");
          } else if ((job.total_completed ?? 0) > 0) {
            openPdfs(jobProgress.jobId);
          } else {
            setError("생성된 문항이 없습니다.");
          }
        }
      } catch {
        /* ignore */
      }
    };

    void poll();
    const t = window.setInterval(() => void poll(), 1800);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [jobProgress?.jobId, jobProgress?.done, jobProgress?.total, basePath]);

  const personalPresets = presets.filter((p) => !p.is_system);
  const generating = Boolean(jobProgress && !jobProgress.done);
  const pct =
    jobProgress && jobProgress.total > 0
      ? Math.min(
          100,
          Math.round(
            ((jobProgress.completed + jobProgress.failed) / jobProgress.total) *
              100
          )
        )
      : jobProgress && !jobProgress.done
        ? 5
        : 0;

  const sortedGroups = useMemo(
    () =>
      [...QUESTION_TYPE_GROUPS].sort(
        (a, b) =>
          CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]) -
          CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number])
      ),
    []
  );

  return (
    <div className="pb-28">
      <PageHeader
        title="영어 변형문제 생성"
        description="왼쪽에서 유형 세트 수를 고르고, 오른쪽에 지문을 여러 개 넣으면 지문마다 같은 유형으로 생성됩니다."
        action={
          <Link
            href={basePath}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← 내 자료
          </Link>
        }
      />

      {jobProgress && (
        <div className="sticky top-0 z-30 mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm">
          {generating ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-900">
                  문제 생성 중 · {jobProgress.completed + jobProgress.failed}/
                  {jobProgress.total}
                </p>
                <p className="truncate text-xs text-brand-800">
                  {jobProgress.message} · 이 페이지를 나가도 생성은 계속됩니다
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-brand-700 transition-all duration-500"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
              <Link
                href={basePath}
                className="shrink-0 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-medium text-brand-800"
              >
                내 자료로
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-brand-900">
                생성 완료 · PDF 탭을 확인하세요
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => openPdfs(jobProgress.jobId)}
                >
                  문제·해설 PDF 열기
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setJobProgress(null);
                    setError(null);
                  }}
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !generating && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {message && !generating && (
        <div className="mb-4">
          <Alert variant="success">{message}</Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
        {/* 왼쪽: 유형별 세트 */}
        <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          <section className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-900">
                유형별 세트 수
              </h2>
              <span className="text-xs text-slate-500">
                지문당 {perPassageTotals.total}문항
              </span>
            </div>
            <p className="px-1 text-[11px] text-slate-500">
              선택한 세트는 모든 지문에 동일하게 적용됩니다.
            </p>
            {sortedGroups.map((group) => {
              const selectedInGroup = group.options.reduce(
                (acc, o) => acc + (counts[o.key] ?? 0),
                0
              );
              const open = openCats[group.category] ?? true;
              const isMainIdea = group.category === "main_idea";
              const isDetails = group.category === "details";
              const isInference = group.category === "inference";
              const isGrammar = group.category === "grammar_vocabulary";
              return (
                <div
                  key={group.category}
                  className={`rounded-2xl border bg-white shadow-card ${
                    isMainIdea
                      ? "border-brand-300 ring-1 ring-brand-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex w-full items-center gap-1 px-2.5 py-1.5">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between text-left"
                      onClick={() =>
                        setOpenCats((prev) => ({
                          ...prev,
                          [group.category]: !open,
                        }))
                      }
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {group.label.replace(/^Section ·\s*/, "")}
                        {selectedInGroup > 0 && (
                          <span className="ml-2 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                            {selectedInGroup}
                          </span>
                        )}
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">
                        {open ? "▲" : "▼"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-default disabled:opacity-40"
                      disabled={selectedInGroup === 0}
                      onClick={() =>
                        resetCategory(group.options.map((o) => o.key))
                      }
                    >
                      초기화
                    </button>
                  </div>
                  {open && (
                    <div className="border-t border-slate-100 px-2 py-1.5">
                  {isMainIdea ? (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-snug text-slate-500">
                        하/상 · (영)/(한)
                      </p>
                      {(
                        [
                          {
                            rowLabel: "제목",
                            keys: [
                              "title:en:low:제목추론",
                              "title:en:high:제목추론",
                              "title:ko:low:제목추론",
                              "title:ko:high:제목추론",
                            ],
                          },
                          {
                            rowLabel: "주제",
                            keys: [
                              "topic:en:low:주제추론",
                              "topic:en:high:주제추론",
                              "topic:ko:low:주제추론",
                              "topic:ko:high:주제추론",
                            ],
                          },
                          {
                            rowLabel: "요지",
                            keys: [
                              "summary_mcq:ko:low:요지추론",
                              "summary_mcq:ko:high:요지추론",
                            ],
                          },
                        ] as const
                      ).map((row) => (
                        <div key={row.rowLabel}>
                          <p className="mb-1 text-[11px] font-semibold text-slate-700">
                            {row.rowLabel}
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {row.keys.map((key) => {
                              const opt = group.options.find(
                                (o) => o.key === key
                              );
                              if (!opt) return null;
                              const n = counts[key] ?? 0;
                              return (
                                <div
                                  key={key}
                                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1"
                                >
                                  <span className="block truncate text-[11px] font-medium text-slate-800">
                                    {opt.label}
                                  </span>
                                  <div className="mt-0.5 flex items-center justify-between gap-0.5">
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n - 1)}
                                    >
                                      −
                                    </button>
                                    <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-slate-900">
                                      {n}
                                    </span>
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n + 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() =>
                          addCounts([
                            ["title:en:low:제목추론", 1],
                            ["title:en:high:제목추론", 1],
                            ["title:ko:low:제목추론", 1],
                            ["title:ko:high:제목추론", 1],
                            ["topic:en:low:주제추론", 1],
                            ["topic:en:high:주제추론", 1],
                            ["topic:ko:low:주제추론", 1],
                            ["topic:ko:high:주제추론", 1],
                            ["summary_mcq:ko:low:요지추론", 1],
                            ["summary_mcq:ko:high:요지추론", 1],
                          ])
                        }
                      >
                        모두 넣기 (+1)
                      </Button>
                    </div>
                  ) : isDetails ? (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-snug text-slate-500">
                        하/상 · (영)/(한) · 효자·학력평가형 일치/불일치
                      </p>
                      {(
                        [
                          {
                            rowLabel: "일치",
                            keys: [
                              "content_true:en:low:내용일치",
                              "content_true:en:high:내용일치",
                              "content_true:ko:low:내용일치",
                              "content_true:ko:high:내용일치",
                            ],
                          },
                          {
                            rowLabel: "불일치",
                            keys: [
                              "content_false:en:low:내용불일치",
                              "content_false:en:high:내용불일치",
                              "content_false:ko:low:내용불일치",
                              "content_false:ko:high:내용불일치",
                            ],
                          },
                          {
                            rowLabel: "일치개수",
                            keys: [
                              "content_count:en:low:일치개수",
                              "content_count:en:high:일치개수",
                              "content_count:ko:low:일치개수",
                              "content_count:ko:high:일치개수",
                            ],
                          },
                        ] as const
                      ).map((row) => (
                        <div key={row.rowLabel}>
                          <p className="mb-1 text-[11px] font-semibold text-slate-700">
                            {row.rowLabel} 세트 수
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {row.keys.map((key) => {
                              const opt = group.options.find(
                                (o) => o.key === key
                              );
                              if (!opt) return null;
                              const n = counts[key] ?? 0;
                              return (
                                <div
                                  key={key}
                                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1"
                                >
                                  <span className="block truncate text-[11px] font-medium text-slate-800">
                                    {opt.label}
                                  </span>
                                  <div className="mt-0.5 flex items-center justify-between gap-0.5">
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n - 1)}
                                    >
                                      −
                                    </button>
                                    <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-slate-900">
                                      {n}
                                    </span>
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n + 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() =>
                          addCounts([
                            ["content_true:en:low:내용일치", 1],
                            ["content_true:en:high:내용일치", 1],
                            ["content_true:ko:low:내용일치", 1],
                            ["content_true:ko:high:내용일치", 1],
                            ["content_false:en:low:내용불일치", 1],
                            ["content_false:en:high:내용불일치", 1],
                            ["content_false:ko:low:내용불일치", 1],
                            ["content_false:ko:high:내용불일치", 1],
                            ["content_count:en:low:일치개수", 1],
                            ["content_count:en:high:일치개수", 1],
                            ["content_count:ko:low:일치개수", 1],
                            ["content_count:ko:high:일치개수", 1],
                          ])
                        }
                      >
                        모두 넣기 (+1)
                      </Button>
                    </div>
                  ) : isInference ? (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-snug text-slate-500">
                        하/상 · 효자·학력평가형 (순서·빈칸·삽입·무관)
                      </p>
                      {(
                        [
                          {
                            rowLabel: "순서",
                            keys: [
                              "order:na:low:순서추론",
                              "order:na:high:순서추론",
                            ],
                          },
                          {
                            rowLabel: "문장빈칸",
                            keys: [
                              "sentence_blank:en:low:빈칸추론",
                              "sentence_blank:en:high:빈칸추론",
                            ],
                          },
                          {
                            rowLabel: "삽입",
                            keys: [
                              "sentence_insertion:na:low:문장삽입",
                              "sentence_insertion:na:high:문장삽입",
                            ],
                          },
                          {
                            rowLabel: "무관한 문장",
                            keys: [
                              "irrelevant_sentence:na:low:무관한문장",
                              "irrelevant_sentence:na:high:무관한문장",
                            ],
                          },
                        ] as const
                      ).map((row) => (
                        <div key={row.rowLabel}>
                          <p className="mb-1 text-[11px] font-semibold text-slate-700">
                            {row.rowLabel}
                          </p>
                          <div className="grid grid-cols-2 gap-1">
                            {row.keys.map((key) => {
                              const opt = group.options.find(
                                (o) => o.key === key
                              );
                              if (!opt) return null;
                              const n = counts[key] ?? 0;
                              return (
                                <div
                                  key={key}
                                  className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1"
                                >
                                  <span className="block truncate text-[10px] font-medium text-slate-800">
                                    {opt.label}
                                  </span>
                                  <div className="mt-0.5 flex items-center justify-between gap-0.5">
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n - 1)}
                                    >
                                      −
                                    </button>
                                    <span className="min-w-[1.25rem] text-center text-xs font-bold tabular-nums text-slate-900">
                                      {n}
                                    </span>
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                      onClick={() => setCount(key, n + 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div>
                        <p className="mb-1 text-[11px] font-semibold text-slate-700">
                          함축의미추론
                          <span className="ml-1 font-normal text-slate-400">
                            (난이도 없음)
                          </span>
                        </p>
                        {(() => {
                          const key =
                            "underlined_inference:en:default:함축의미추론";
                          const n = counts[key] ?? 0;
                          return (
                            <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-1">
                              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                                영어 보기 · 없으면 생략
                              </span>
                              <button
                                type="button"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                onClick={() => setCount(key, n - 1)}
                              >
                                −
                              </button>
                              <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-slate-900">
                                {n}
                              </span>
                              <button
                                type="button"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                onClick={() => setCount(key, n + 1)}
                              >
                                +
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full text-xs"
                        onClick={() =>
                          addCounts([
                            ["order:na:low:순서추론", 1],
                            ["order:na:high:순서추론", 1],
                            ["sentence_blank:en:low:빈칸추론", 1],
                            ["sentence_blank:en:high:빈칸추론", 1],
                            ["sentence_insertion:na:low:문장삽입", 1],
                            ["sentence_insertion:na:high:문장삽입", 1],
                            ["irrelevant_sentence:na:low:무관한문장", 1],
                            ["irrelevant_sentence:na:high:무관한문장", 1],
                            [
                              "underlined_inference:en:default:함축의미추론",
                              1,
                            ],
                          ])
                        }
                      >
                        모두 넣기 (+1)
                      </Button>
                      <details className="rounded-lg border border-slate-100 bg-slate-50/50 px-2 py-1.5">
                        <summary className="cursor-pointer text-[11px] font-medium text-slate-500">
                          기타 (목적·심경·연결어)
                        </summary>
                        <div className="mt-1 space-y-0.5">
                          {[
                            "underlined_inference:en:default:목적추론",
                            "underlined_inference:en:default:심경추론",
                            "sentence_blank:en:default:연결어빈칸",
                          ].map((key) => {
                            const opt = group.options.find(
                              (o) => o.key === key
                            );
                            if (!opt) return null;
                            const n = counts[key] ?? 0;
                            return (
                              <div
                                key={key}
                                className="flex items-center gap-1 rounded border border-slate-100 bg-white px-1.5 py-0.5"
                              >
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-800">
                                  {opt.label}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                  onClick={() => setCount(key, n - 1)}
                                >
                                  −
                                </button>
                                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-slate-900">
                                  {n}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                  onClick={() => setCount(key, n + 1)}
                                >
                                  +
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  ) : isGrammar ? (
                    <div className="space-y-1">
                      {(
                        [
                          {
                            key: "grammar:na:default:어법추론",
                            label: "어법 추론",
                          },
                          {
                            key: "grammar:na:default:어법개수",
                            label: "어법 개수",
                          },
                          {
                            key: "vocabulary:na:default:어휘추론",
                            label: "어휘 추론",
                          },
                          {
                            key: "vocabulary:na:default:어휘개수",
                            label: "어휘 개수",
                          },
                        ] as const
                      ).map((row) => {
                        const opt = group.options.find((o) => o.key === row.key);
                        if (!opt) return null;
                        const n = counts[row.key] ?? 0;
                        return (
                          <div
                            key={row.key}
                            className="flex items-center gap-1 rounded border border-slate-100 bg-slate-50/80 px-1.5 py-0.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-[11px] text-slate-800">
                              {row.label}
                            </span>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                              onClick={() => setCount(row.key, n - 1)}
                            >
                              −
                            </button>
                            <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-900">
                              {n}
                            </span>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                              onClick={() => setCount(row.key, n + 1)}
                            >
                              +
                            </button>
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-1 w-full text-xs"
                        onClick={() =>
                          addCounts([
                            ["grammar:na:default:어법추론", 1],
                            ["grammar:na:default:어법개수", 1],
                            ["vocabulary:na:default:어휘추론", 1],
                            ["vocabulary:na:default:어휘개수", 1],
                          ])
                        }
                      >
                        모두 넣기 (+1)
                      </Button>
                    </div>
                  ) : (
                        <div className="space-y-0.5">
                          {group.options.map((opt) => {
                            const n = counts[opt.key] ?? 0;
                            return (
                              <div
                                key={opt.key}
                                className="flex items-center gap-1 rounded border border-slate-100 bg-slate-50/80 px-1.5 py-0.5"
                              >
                                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-800">
                                  {opt.label}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                  onClick={() => setCount(opt.key, n - 1)}
                                >
                                  −
                                </button>
                                <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-slate-900">
                                  {n}
                                </span>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                                  onClick={() => setCount(opt.key, n + 1)}
                                >
                                  +
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {personalPresets.length > 0 && (
              <select
                className="ui-select w-full"
                value={modeTab.startsWith("preset:") ? modeTab : ""}
                onChange={(e) => {
                  const id = e.target.value.replace("preset:", "");
                  const p = personalPresets.find((x) => x.id === id);
                  if (p) applyDbPreset(p);
                }}
              >
                <option value="">저장한 프리셋 불러오기…</option>
                {personalPresets.map((p) => (
                  <option key={p.id} value={`preset:${p.id}`}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </section>
        </aside>

        {/* 오른쪽: 기본 정보 + 지문들 */}
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              기본 정보
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="ui-label">자료 제목</span>
                <input
                  className="ui-input mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 2026년 3월 고1 모의고사 변형"
                />
              </label>
              <label className="block">
                <span className="ui-label">학교명 (선택)</span>
                <input
                  className="ui-input mt-1"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="ui-label">학년</span>
                <select
                  className="ui-select mt-1"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {GRADES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="ui-label">출처</span>
                <select
                  className="ui-select mt-1"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                >
                  {SOURCE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="ui-label">전체 난이도 기준</span>
                <select
                  className="ui-select mt-1"
                  value={overallDifficulty}
                  onChange={(e) => setOverallDifficulty(e.target.value)}
                >
                  {OVERALL_DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="ui-label">공통 출처 상세</span>
                <input
                  className="ui-input mt-1"
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  placeholder="예: 2026년 3월 고1 모의고사 (지문별로 덮어쓸 수 있음)"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {savedAt
                ? `마지막 임시 저장: ${new Date(savedAt).toLocaleString("ko-KR")}`
                : "변경 사항은 자동으로 임시 저장됩니다."}
              {role === "admin" ? " · 관리자" : " · 강사"}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                영어 지문
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {filledPassages.length}/{passages.length}개 입력 · 최대{" "}
                  {MAX_PASSAGES}개
                </span>
              </h2>
              <Button
                type="button"
                variant="secondary"
                disabled={passages.length >= MAX_PASSAGES}
                onClick={addPassage}
              >
                + 지문 추가
              </Button>
            </div>

            {passages.map((p, index) => (
              <div
                key={p.clientId ?? index}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-800">
                    지문 {index + 1}
                  </p>
                  {passages.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => removePassage(index)}
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="ui-label">지문 제목 (선택)</span>
                    <input
                      className="ui-input mt-1"
                      value={p.title ?? ""}
                      onChange={(e) =>
                        updatePassage(index, { title: e.target.value })
                      }
                      placeholder={`${title || "자료 제목"} · 지문 ${index + 1}`}
                    />
                  </label>
                  <label className="block">
                    <span className="ui-label">출처 상세 (선택)</span>
                    <input
                      className="ui-input mt-1"
                      value={p.sourceDetail ?? ""}
                      onChange={(e) =>
                        updatePassage(index, { sourceDetail: e.target.value })
                      }
                      placeholder={sourceDetail || "공통 출처 사용"}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="ui-label">본문</span>
                  <textarea
                    className="ui-input mt-1 min-h-[180px] font-serif text-[15px] leading-relaxed"
                    value={p.text}
                    onChange={(e) =>
                      updatePassage(index, { text: e.target.value })
                    }
                    placeholder="영어 지문을 그대로 붙여넣으세요."
                    spellCheck={false}
                  />
                </label>
              </div>
            ))}
          </section>

          {showPresetForm && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                현재 유형 설정을 프리셋으로 저장
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="ui-input"
                  placeholder="프리셋 이름"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
                <input
                  className="ui-input"
                  placeholder="설명 (선택)"
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={() => void savePreset()}>
                  저장
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPresetForm(false)}
                >
                  취소
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900">
              총 {grandTotal}문항
            </span>
            <span className="mx-2 text-slate-300">|</span>
            지문 {Math.max(filledPassages.length, 1)}개 × 지문당{" "}
            {perPassageTotals.total}
            <span className="mx-2 text-slate-300">|</span>
            객관식 {perPassageTotals.objective} · 주관식{" "}
            {perPassageTotals.subjective}
            {grandTotal > MAX_TOTAL_QUESTIONS && (
              <span className="ml-2 text-red-600">
                (최대 {MAX_TOTAL_QUESTIONS} 초과)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void saveDraft()}
            >
              임시 저장
            </Button>
            <Button type="button" variant="ghost" onClick={resetAll}>
              유형 초기화
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPresetForm(true)}
            >
              프리셋 저장
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                generating ||
                perPassageTotals.total === 0 ||
                filledPassages.length === 0
              }
              onClick={() => void startGenerate()}
            >
              {generating ? "생성 중…" : busy ? "요청 중…" : "변형문제 생성"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
