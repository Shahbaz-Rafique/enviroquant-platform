"use client";

import { ArrowLeft, ArrowRight, Loader2, Map, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import type { Project } from "@/lib/types";

type ProjectFormState = {
  name: string;
  sector: string;
  country: string;
  location: string;
  description: string;
  capacity: string;
  timeline: string;
};

const initialState: ProjectFormState = {
  name: "",
  sector: "",
  country: "",
  location: "",
  description: "",
  capacity: "",
  timeline: ""
};

const projectComponents = [
  "Access Roads",
  "Buildings & Facilities",
  "Power Supply",
  "Water Management",
  "Waste Treatment"
];

export function ProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof ProjectFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const project = await apiRequest<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          sector: form.sector || null,
          country: form.country || null,
          location: form.location || null,
          description: form.description || null,
          metadata: {
            capacity: form.capacity || null,
            timeline: form.timeline || null,
            project_components: selectedComponents
          }
        })
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project could not be created");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error ? <Alert className="mb-5 border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name <span className="text-red-600">*</span></Label>
            <Input
              id="name"
              required
              placeholder="Enter project name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Project location <span className="text-red-600">*</span></Label>
            <Input
              id="location"
              required
              placeholder="Enter location or coordinates"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Project overview <span className="text-red-600">*</span></Label>
            <Textarea
              id="description"
              required
              placeholder="Provide a brief description of the project."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sector">Project type <span className="text-red-600">*</span></Label>
              <Input
                id="sector"
                required
                placeholder="Select or enter project type"
                value={form.sector}
                onChange={(event) => updateField("sector", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="capacity">Project size & capacity</Label>
              <Input
                id="capacity"
                placeholder="e.g. 150 hectares"
                value={form.capacity}
                onChange={(event) => updateField("capacity", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeline">Estimated project timeline</Label>
              <Input
                id="timeline"
                type="date"
                value={form.timeline}
                onChange={(event) => updateField("timeline", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label>Key project components</Label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {projectComponents.map((component) => (
                <div key={component} className="flex items-center gap-2 rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-3">
                  <Checkbox
                    checked={selectedComponents.includes(component)}
                    id={`component-${component}`}
                    onCheckedChange={(checked) => setSelectedComponents((current) => checked ? [...current, component] : current.filter((item) => item !== component))}
                  />
                  <Label className="cursor-pointer text-sm font-medium text-[#52675e]" htmlFor={`component-${component}`}>
                    {component}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-dashed border-[#cbdad3] bg-[#f8faf9] p-4">
          <div className="flex items-center justify-between gap-3">
            <Label>Project area mapping</Label>
            <Badge className="border-slate-200 bg-slate-100 text-slate-600">Roadmap</Badge>
          </div>
          <div className="mt-3 grid aspect-video place-items-center rounded-lg border border-dashed border-[#cbdad3] bg-white">
            <div className="px-4 text-center text-sm text-[#74847d]">
              <Map className="mx-auto mb-2 size-10 text-[#6f9f87]" />
              Interactive project-area mapping is not available yet. Add maps and plans as evidence after creating the project.
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#e3eae6] pt-5 sm:flex-row sm:items-center">
        <Button type="button" variant="secondary" onClick={() => router.push("/projects")}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <span className="text-xs text-[#74847d]">Next: evidence and structured EIA setup.</span>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save & continue <ArrowRight />
        </Button>
        </div>
      </div>
    </form>
  );
}
