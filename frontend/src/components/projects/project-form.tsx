"use client";

import { Loader2, Map, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
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
            timeline: form.timeline || null
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
            <Label htmlFor="name">Project Name*</Label>
            <Input
              id="name"
              required
              placeholder="Enter project name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Project Location*</Label>
            <Input
              id="location"
              required
              placeholder="Enter location or coordinates"
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Project Overview*</Label>
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
              <Label htmlFor="sector">Project Type*</Label>
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
              <Label htmlFor="capacity">Project Size & Capacity</Label>
              <Input
                id="capacity"
                placeholder="e.g. 150 hectares"
                value={form.capacity}
                onChange={(event) => updateField("capacity", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeline">Project Timeline</Label>
              <Input
                id="timeline"
                placeholder="e.g. 2026-2028"
                value={form.timeline}
                onChange={(event) => updateField("timeline", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label>Key Project Components</Label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {projectComponents.map((component) => (
                <div key={component} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Checkbox id={`component-${component}`} />
                  <Label className="cursor-pointer text-sm font-medium text-white/76" htmlFor={`component-${component}`}>
                    {component}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-4">
          <Label>Upload Project Map</Label>
          <div className="mt-3 grid aspect-video place-items-center rounded-2xl border border-dashed border-[#67E8F9]/20 bg-white/[0.03]">
            <div className="text-center text-sm text-white/56">
              <Map className="mx-auto mb-2 size-10 text-[#B6F7FF]" />
              Map upload comes with document evidence in this phase.
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex justify-end border-t border-white/10 pt-5">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save & Continue
        </Button>
      </div>
    </form>
  );
}
