"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Wand2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type SubsectionSuggestion = {
  subsection_id: string;
  title: string;
  suggestions: string[];
  draft_html?: string;
};

type Suggestions = {
  engine: string;
  summary: string;
  expectations: string[];
  sources: { title: string; url: string }[];
  subsections: SubsectionSuggestion[];
};

export function SectionSuggestions({
  documentId,
  sectionId,
  autoOpen,
  onInsertDraft,
}: {
  documentId: string;
  sectionId: string;
  autoOpen?: boolean;
  onInsertDraft?: (subsectionId: string, html: string) => void;
}) {
  const [result, setResult] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inserted, setInserted] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const didAutoOpen = useRef(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setInserted(new Set());
    setConfirming(null);
    try {
      setResult(
        await apiRequest<Suggestions>(
          `/eia-documents/${documentId}/sections/${sectionId}/suggestions`,
          { method: "POST" }
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoOpen && !didAutoOpen.current) {
      didAutoOpen.current = true;
      void generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  function requestInsert(subsectionId: string) {
    setConfirming(subsectionId);
  }

  function confirmInsert(subsectionId: string, html: string) {
    onInsertDraft?.(subsectionId, html);
    setInserted((prev) => new Set(prev).add(subsectionId));
    setConfirming(null);
  }

  return (
    <section className="rounded-xl border border-[#c9dfd2] bg-[#f4faf6] p-4 text-[#18372c]" aria-label="AI suggestions">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-bold">
          <Lightbulb className="size-4" aria-hidden="true" />
          AI draft assistant
        </h3>
        <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={generate}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          {loading ? "Drafting…" : result ? "Regenerate" : "Generate drafts"}
        </Button>
      </div>
      <p className="mt-2 text-sm text-[#52675e]">
        Review the AI draft for each subsection, then approve to insert it into the editor.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p className="text-sm">
            <strong>{result.engine === "ai" ? "AI guidance" : "Checklist guidance"}:</strong> {result.summary}
          </p>

          {result.engine === "ai" && result.subsections.some((s) => s.draft_html) ? (
            <div className="grid gap-3">
              {result.subsections.filter((s) => s.draft_html).map((item) => (
                <div key={item.subsection_id} className="overflow-hidden rounded-lg border border-[#c9dfd2] bg-white">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-[#e3eae6] px-3 py-2.5">
                    <span className="text-sm font-semibold text-[#18372c]">{item.title}</span>
                    {onInsertDraft ? (
                      inserted.has(item.subsection_id) ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="size-3.5" /> Inserted
                        </span>
                      ) : confirming === item.subsection_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#697a73]">Replace your current draft?</span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => confirmInsert(item.subsection_id, item.draft_html!)}
                          >
                            Yes, insert
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirming(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => requestInsert(item.subsection_id)}
                        >
                          <Wand2 className="size-3.5" />
                          Insert draft
                        </Button>
                      )
                    ) : null}
                  </div>

                  {/* Draft preview */}
                  <div
                    className="prose prose-sm max-w-none p-3 text-[#344f44] [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-6 [&_strong]:text-[#18372c]"
                    dangerouslySetInnerHTML={{ __html: item.draft_html! }}
                  />

                  {/* Suggestions */}
                  {item.suggestions.length ? (
                    <ul className="grid gap-1 border-t border-[#e3eae6] bg-[#f8faf9] px-3 py-2.5">
                      {item.suggestions.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-xs text-[#52675e]">
                          <span className="mt-0.5 shrink-0 text-[#287451]">▸</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">What this section should cover</summary>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                  {result.expectations.map((point) => <li key={point}>{point}</li>)}
                </ul>
              </details>
              {result.subsections.map((item) => (
                <details key={item.subsection_id} className="rounded-lg border border-[#dce6e1] bg-white p-3">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {item.title} · {item.suggestions.length} suggestions
                  </summary>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[#344f44]">
                    {item.suggestions.map((point, index) => <li key={index}>{point}</li>)}
                  </ul>
                </details>
              ))}
            </>
          )}

          <p className="text-xs text-[#52675e]">
            General guidance only — not a compliance decision. Verify all facts and local requirements before submitting.
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {result.sources.map((source) => (
              <a
                className="font-semibold text-[#236c4a] underline"
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
