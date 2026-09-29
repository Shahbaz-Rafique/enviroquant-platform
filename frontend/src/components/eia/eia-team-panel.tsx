"use client";

import { Copy, Loader2, RefreshCcw, Trash2, UserPlus, Users } from "lucide-react";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { EiaDocumentMember, EiaDocumentMemberInvitation } from "@/lib/types";

type EiaTeamPanelProps = {
  documentId: string;
  members: EiaDocumentMember[];
  canManage: boolean;
  currentUserId: string;
  loading?: boolean;
  onMembersChange: (members: EiaDocumentMember[]) => void;
  onRefresh: () => Promise<void>;
};

const documentRoles = [
  { value: "EDITOR", label: "Specialist / Author", description: "Can author assigned sections" },
  { value: "REVIEWER", label: "Reviewer", description: "Can review and approve sections" },
  { value: "COMMENTER", label: "Commenter", description: "Can add comments only" },
  { value: "VIEWER", label: "Viewer", description: "Read-only access" }
];

const roleBadgeClass: Record<string, string> = {
  EDITOR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REVIEWER: "border-amber-200 bg-amber-50 text-amber-700",
  COMMENTER: "border-blue-200 bg-blue-50 text-blue-700",
  VIEWER: "border-slate-200 bg-slate-50 text-slate-600",
};

export function EiaTeamPanel({
  documentId,
  members,
  canManage,
  currentUserId,
  loading = false,
  onMembersChange,
  onRefresh
}: EiaTeamPanelProps) {
  const [saving, setSaving] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [documentRole, setDocumentRole] = useState("EDITOR");
  const [showInviteForm, setShowInviteForm] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSaving(true);
    setError(null);
    setInviteUrl(null);
    try {
      const invitation = await apiRequest<EiaDocumentMemberInvitation>(`/eia-documents/${documentId}/members`, {
        method: "POST",
        body: JSON.stringify({
          full_name: String(form.get("full_name") ?? ""),
          email: String(form.get("email") ?? ""),
          role: documentRole
        })
      });
      onMembersChange(upsertMember(members, invitation.member));
      setInviteUrl(invitation.invite_url);
      formElement.reset();
      setDocumentRole("EDITOR");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Member could not be invited");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: EiaDocumentMember) {
    setRemovingUserId(member.user_id);
    setError(null);
    try {
      await apiRequest<void>(`/eia-documents/${documentId}/members/${member.user_id}`, {
        method: "DELETE"
      });
      onMembersChange(members.filter((item) => item.user_id !== member.user_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Member could not be removed");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Members could not be refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  async function copyInviteUrl() {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="border-b border-[#e3eae6] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#287451]">Document team</p>
            <h3 className="mt-1 text-lg font-bold text-[#18372c]">{canManage ? "Manage collaborators" : "Collaborators"}</h3>
            <p className="mt-1 text-xs text-[#73827b]">
              {members.length} member{members.length !== 1 ? "s" : ""} on this document
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" type="button" variant="secondary" onClick={refresh}>
              <RefreshCcw className={cn("size-3.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {canManage ? (
              <Button size="sm" type="button" onClick={() => setShowInviteForm(!showInviteForm)}>
                <UserPlus className="size-3.5" />
                {showInviteForm ? "Cancel" : "Invite member"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

        {canManage && inviteUrl ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <p className="mb-2 text-xs font-semibold">Member invited successfully! Share this link:</p>
            <div className="flex min-w-0 gap-2">
              <Input readOnly value={inviteUrl} className="border-emerald-200 bg-white font-mono text-xs text-emerald-800" />
              <Button type="button" variant="secondary" size="icon" onClick={copyInviteUrl} aria-label="Copy invite link">
                <Copy className="size-3.5" />
              </Button>
            </div>
          </Alert>
        ) : null}

        {showInviteForm && canManage ? (
          <form className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-4" onSubmit={submit}>
            <h4 className="mb-3 text-sm font-bold text-[#18372c]">Invite a new member</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="eia-member-full-name" className="text-xs font-semibold text-[#52675e]">Full name</Label>
                <Input id="eia-member-full-name" name="full_name" required minLength={2} placeholder="John Smith" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="eia-member-email" className="text-xs font-semibold text-[#52675e]">Email</Label>
                <Input id="eia-member-email" name="email" type="email" required placeholder="john@example.com" />
              </div>
            </div>
            <div className="mt-3 grid gap-1.5">
              <Label htmlFor="eia-member-role" className="text-xs font-semibold text-[#52675e]">Document role</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {documentRoles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setDocumentRole(role.value)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      documentRole === role.value
                        ? "border-[#287451] bg-[#edf6f1] ring-1 ring-[#287451]/20"
                        : "border-[#dce6e1] bg-white hover:border-[#c4d4cc]"
                    )}
                  >
                    <span className="block text-xs font-bold text-[#18372c]">{role.label}</span>
                    <span className="mt-0.5 block text-[11px] text-[#73827b]">{role.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                Send invitation
              </Button>
            </div>
          </form>
        ) : null}

        {loading ? <p className="py-4 text-center text-sm text-[#73827b]">Loading team...</p> : null}
        {!loading && !members.length ? (
          <div className="rounded-xl border border-dashed border-[#cfdcd6] bg-[#f8faf9] py-8 text-center">
            <Users className="mx-auto size-8 text-[#9aaba3]" />
            <p className="mt-2 text-sm font-semibold text-[#52675e]">No members yet</p>
            <p className="mt-1 text-xs text-[#73827b]">{canManage ? "Invite team members to start collaborating." : "Ask your administrator to add team members."}</p>
          </div>
        ) : null}

        {members.length > 0 ? (
          <div className="grid gap-2">
            {members.map((member) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-[#dce6e1] bg-white px-4 py-3 transition-shadow hover:shadow-sm"
                key={member.id}
              >
                <span className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                  member.user_id === currentUserId
                    ? "bg-[#287451] text-white"
                    : "bg-[#edf6f1] text-[#287451]"
                )}>
                  {getInitials(member.user.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#18372c]">{member.user.full_name}</span>
                    {member.user_id === currentUserId ? (
                      <span className="shrink-0 text-[10px] font-bold text-[#287451]">You</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-[#73827b]">{member.user.email}</div>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  roleBadgeClass[member.role] ?? roleBadgeClass.VIEWER
                )}>
                  {member.role}
                </span>
                {canManage && member.user_id !== currentUserId ? (
                  <Button
                    aria-label={`Remove ${member.user.full_name}`}
                    disabled={removingUserId === member.user_id}
                    size="icon"
                    type="button"
                    variant="secondary"
                    className="size-8 shrink-0"
                    onClick={() => removeMember(member)}
                  >
                    {removingUserId === member.user_id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function upsertMember(members: EiaDocumentMember[], member: EiaDocumentMember) {
  const exists = members.some((item) => item.user_id === member.user_id);
  if (!exists) {
    return [...members, member];
  }
  return members.map((item) => (item.user_id === member.user_id ? member : item));
}
