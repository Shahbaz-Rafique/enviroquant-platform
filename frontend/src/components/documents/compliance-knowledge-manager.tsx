"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookMarked, Search } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import type { EiaReusableContent, RegulationRequirement, RegulationStandard } from "@/lib/types";


export function ComplianceKnowledgeManager({ canManage }: { canManage: boolean }) {
  const [standards, setStandards] = useState<RegulationStandard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [standardForm, setStandardForm] = useState({ code: "", title: "", jurisdiction: "", version: "" });
  const [requirementForm, setRequirementForm] = useState({ standardId: "", code: "", title: "", text: "", tags: "" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EiaReusableContent[]>([]);

  const loadStandards = useCallback(async () => {
    try {
      setStandards(await apiRequest<RegulationStandard[]>("/regulations"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compliance knowledge could not be loaded");
    }
  }, []);

  useEffect(() => {
    void loadStandards();
  }, [loadStandards]);

  async function createStandard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest<RegulationStandard>("/regulations", {
        method: "POST",
        body: JSON.stringify(standardForm)
      });
      setStandardForm({ code: "", title: "", jurisdiction: "", version: "" });
      await loadStandards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Standard could not be saved");
    }
  }

  async function createRequirement(event: FormEvent) {
    event.preventDefault();
    if (!requirementForm.standardId) return;
    setError(null);
    try {
      await apiRequest<RegulationRequirement>(`/regulations/${requirementForm.standardId}/requirements`, {
        method: "POST",
        body: JSON.stringify({
          requirement_code: requirementForm.code,
          title: requirementForm.title,
          requirement_text: requirementForm.text,
          section_tags: requirementForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        })
      });
      setRequirementForm((current) => ({ ...current, code: "", title: "", text: "", tags: "" }));
      await loadStandards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Requirement could not be saved");
    }
  }

  async function searchContent(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setError(null);
    try {
      setResults(await apiRequest<EiaReusableContent[]>(`/eia-documents/content-library/search?query=${encodeURIComponent(query)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reusable content search failed");
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {error ? <Alert className="xl:col-span-2">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookMarked className="size-5" /> Compliance knowledge</CardTitle>
          <CardDescription>Version regulations and link requirements to checklist sections using tags such as 4 or 4.6.1.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {canManage ? <form className="grid gap-3 sm:grid-cols-2" onSubmit={createStandard}>
            <Input required placeholder="Standard code" value={standardForm.code} onChange={(event) => setStandardForm({ ...standardForm, code: event.target.value })} />
            <Input required placeholder="Version" value={standardForm.version} onChange={(event) => setStandardForm({ ...standardForm, version: event.target.value })} />
            <Input required placeholder="Standard title" value={standardForm.title} onChange={(event) => setStandardForm({ ...standardForm, title: event.target.value })} />
            <Input required placeholder="Jurisdiction" value={standardForm.jurisdiction} onChange={(event) => setStandardForm({ ...standardForm, jurisdiction: event.target.value })} />
            <Button className="sm:col-span-2" type="submit">Add standard</Button>
          </form> : null}
          {canManage ? <form className="grid gap-3" onSubmit={createRequirement}>
            <Select value={requirementForm.standardId} onValueChange={(standardId) => setRequirementForm({ ...requirementForm, standardId })}>
              <SelectTrigger><SelectValue placeholder="Select standard" /></SelectTrigger>
              <SelectContent>{standards.map((standard) => <SelectItem key={standard.id} value={standard.id}>{standard.code} · {standard.version}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input required placeholder="Requirement code" value={requirementForm.code} onChange={(event) => setRequirementForm({ ...requirementForm, code: event.target.value })} />
              <Input required placeholder="Requirement title" value={requirementForm.title} onChange={(event) => setRequirementForm({ ...requirementForm, title: event.target.value })} />
            </div>
            <textarea required className="min-h-28 rounded-xl border border-white/12 bg-white/[0.04] p-3 text-sm text-white outline-none" placeholder="Requirement text" value={requirementForm.text} onChange={(event) => setRequirementForm({ ...requirementForm, text: event.target.value })} />
            <Input placeholder="Checklist tags, comma separated" value={requirementForm.tags} onChange={(event) => setRequirementForm({ ...requirementForm, tags: event.target.value })} />
            <Button disabled={!requirementForm.standardId} type="submit">Add requirement</Button>
          </form> : null}
          <div className="space-y-2">
            {standards.map((standard) => <div className="rounded-xl border border-white/10 p-3 text-sm" key={standard.id}><strong>{standard.code} · {standard.version}</strong><div className="text-white/58">{standard.jurisdiction} · {standard.requirements.length} requirements</div></div>)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="size-5" /> Reusable EIA content</CardTitle>
          <CardDescription>Search only EIAs you created or were assigned to, then reuse validated wording with its source retained.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" onSubmit={searchContent}>
            <Input placeholder="Search previous assessment content" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Button type="submit">Search</Button>
          </form>
          {!results.length ? <Alert>No reusable content selected.</Alert> : null}
          {results.map((item) => <article className="rounded-xl border border-white/10 p-4" key={item.subsection_id}><div className="text-xs font-bold uppercase text-emerald-200">{item.subsection_number} · {item.eia_document_title}</div><h3 className="mt-1 font-semibold text-white">{item.subsection_title}</h3><p className="mt-2 text-sm leading-6 text-white/62">{item.excerpt}</p></article>)}
        </CardContent>
      </Card>
    </section>
  );
}
