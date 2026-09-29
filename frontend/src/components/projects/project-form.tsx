"use client";

import { ArrowLeft, ArrowRight, Loader2, MapPin, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ProjectMap } from "@/components/map/project-map-lazy";
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
  country: "State of Kuwait",
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
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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
          latitude: latitude ?? null,
          longitude: longitude ?? null,
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
      {error ? <Alert className="mb-5 border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name <span className="text-red-600">*</span></Label>
            <Input id="name" required placeholder="Enter project name" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Project location <span className="text-red-600">*</span></Label>
            <Input id="location" required placeholder="e.g. Al Ahmadi, Kuwait" value={form.location} onChange={(e) => updateField("location", e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Project overview <span className="text-red-600">*</span></Label>
            <Textarea id="description" required placeholder="Provide a brief description of the project." value={form.description} onChange={(e) => updateField("description", e.target.value)} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sector">Project type <span className="text-red-600">*</span></Label>
              <Input id="sector" required placeholder="e.g. Oil & Gas, Infrastructure" value={form.sector} onChange={(e) => updateField("sector", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Regulatory jurisdiction</Label>
              <Input id="country" readOnly value={form.country} />
              <p className="text-xs text-[#74847d]">EnviroQuant is currently configured for Kuwait EIA requirements.</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="capacity">Project size & capacity</Label>
              <Input id="capacity" placeholder="e.g. 150 hectares" value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeline">Estimated project timeline</Label>
              <Input id="timeline" type="date" value={form.timeline} onChange={(e) => updateField("timeline", e.target.value)} />
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
                  <Label className="cursor-pointer text-sm font-medium text-[#52675e]" htmlFor={`component-${component}`}>{component}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="flex items-center gap-2"><MapPin className="size-4 text-[#287451]" />Project location map</Label>
            {latitude && longitude ? (
              <span className="text-xs text-[#697a73]">{latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
            ) : (
              <span className="text-xs text-[#9aaba3]">Click map to pin location</span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-[#dce6e1] bg-[#f8faf9]" style={{ height: 360 }}>
            <ProjectMap
              latitude={latitude}
              longitude={longitude}
              editable
              locationName={form.location || form.name}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
                if (!form.location) {
                  updateField("location", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
              }}
            />
          </div>
          <p className="text-xs text-[#9aaba3]">Click anywhere on the map to pin the project site. You can drag the pin to adjust.</p>
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
