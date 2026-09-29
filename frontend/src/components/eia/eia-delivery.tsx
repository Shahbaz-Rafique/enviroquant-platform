"use client";

import { useState, type FormEvent } from "react";
import { Download, FileText, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, API_URL } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

export function EiaDelivery({ documentId, title, canEmail, initialSummaryHtml = null }: { documentId: string; title: string; canEmail: boolean; initialSummaryHtml?: string | null }) {
  const [showEmail, setShowEmail] = useState(false);
  const [busy, setBusy] = useState<"docx" | "pdf" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [summaryHtml] = useState<string | null>(initialSummaryHtml);
  async function download(format: "docx" | "pdf") {
    setBusy(format); setError(null);
    try {
      const response = await fetch(`${API_URL}/eia-documents/${documentId}/export.${format}`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
      if (!response.ok) throw new Error(`The ${format.toUpperCase()} report could not be downloaded. Please try again.`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `enviroquant-eia-${documentId}.${format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed."); }
    finally { setBusy(null); }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setBusy("email"); setError(null); setSuccess(null);
    try {
      const format = form.get("format") === "pdf" ? "pdf" : "docx";
      const result = await apiRequest<{ recipient: string }>(`/eia-documents/${documentId}/email`, { method: "POST", body: JSON.stringify({ recipient: form.get("recipient"), subject: form.get("subject"), message: form.get("message"), format }) });
      setSuccess(`Email sent to ${result.recipient} with the ${format.toUpperCase()} report attached.`); setShowEmail(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Email could not be sent."); }
    finally { setBusy(null); }
  }
  return <section className="builder-panel p-4" aria-label="Download or email report">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[#18372c]">Prepare and share your report</h2><p className="mt-1 text-sm text-[#52675e]">Downloading or emailing automatically updates the AI executive summary from your latest saved EIA content.</p></div><div className="flex flex-wrap gap-2">
      <Button disabled={!!busy} onClick={() => void download("docx")}>{busy === "docx" ? <Loader2 className="animate-spin" /> : <Download />}{busy === "docx" ? "Preparing Word…" : "Download Word (.docx)"}</Button>
      <Button variant="secondary" disabled={!!busy} onClick={() => void download("pdf")}>{busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />}{busy === "pdf" ? "Preparing PDF…" : "Download controlled PDF"}</Button>
      {canEmail ? <Button variant="secondary" disabled={!!busy} aria-expanded={showEmail} onClick={() => setShowEmail(!showEmail)}><Mail />{showEmail ? "Close email" : "Email report"}</Button> : null}
    </div></div>
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    {success ? <p role="status" className="mt-3 text-sm text-[#236c4a]">{success}</p> : null}
    {summaryHtml ? <details className="mt-4 rounded-lg border border-[#dce6e1] bg-[#f8faf9] p-4" open>
      <summary className="cursor-pointer font-semibold text-[#18372c]">Saved executive summary preview</summary>
      <div className="prose prose-sm mt-3 max-w-none text-[#344f44]" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
    </details> : null}
    {showEmail && canEmail ? <form onSubmit={send} className="mt-4 grid max-w-xl gap-3 border-t border-[#dce6e1] pt-4">
      <label className="grid gap-1 text-sm font-semibold text-[#18372c]">Recipient email<Input type="email" name="recipient" required placeholder="name@example.com" autoComplete="email" /></label>
      <label className="grid gap-1 text-sm font-semibold text-[#18372c]">Subject<Input name="subject" required maxLength={200} defaultValue={title.slice(0, 200)} /></label>
      <label className="grid gap-1 text-sm font-semibold text-[#18372c]">Message (optional)<Textarea name="message" maxLength={4000} placeholder="Add a short message for the recipient" /></label>
      <label className="grid gap-1 text-sm font-semibold text-[#18372c]">Attachment format<Select name="format" defaultValue="docx"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="docx">Editable Word (.docx)</SelectItem><SelectItem value="pdf">Controlled PDF (.pdf)</SelectItem></SelectContent></Select></label>
      <p className="text-xs text-[#52675e]">Sending shares the full saved report as a DOCX attachment with this recipient.</p>
      <Button type="submit" disabled={!!busy}>{busy === "email" ? <Loader2 className="animate-spin" /> : <Mail />}{busy === "email" ? "Sending…" : "Send email with DOCX"}</Button>
    </form> : null}
  </section>;
}
