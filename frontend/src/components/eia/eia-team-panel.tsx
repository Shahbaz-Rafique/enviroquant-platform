"use client";

import { Copy, Loader2, RefreshCcw, Trash2, UserPlus, Users } from "lucide-react";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
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
  { value: "EDITOR", label: "Editor" },
  { value: "COMMENTER", label: "Commenter" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "VIEWER", label: "Viewer" }
];

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
  const [documentRole, setDocumentRole] = useState("VIEWER");

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
      setDocumentRole("VIEWER");
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
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Users className="size-5 text-blue-700" />
          Team
        </span>
        <Button size="icon" type="button" variant="secondary" onClick={refresh} aria-label="Refresh team">
          <RefreshCcw className={refreshing ? "animate-spin" : undefined} />
        </Button>
      </div>

      <div className="grid gap-4 p-4">
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
        {inviteUrl ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <div className="flex min-w-0 gap-2">
              <Input readOnly value={inviteUrl} className="font-mono text-xs" />
              <Button type="button" variant="secondary" size="icon" onClick={copyInviteUrl} aria-label="Copy invite link">
                <Copy />
              </Button>
            </div>
          </Alert>
        ) : null}

        {canManage ? (
          <form className="grid gap-3" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="eia-member-full-name">Full name</Label>
              <Input id="eia-member-full-name" name="full_name" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eia-member-email">Email</Label>
              <Input id="eia-member-email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eia-member-role">Document role</Label>
              <Select value={documentRole} onValueChange={setDocumentRole}>
                <SelectTrigger id="eia-member-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                {documentRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Invite
            </Button>
          </form>
        ) : null}

        <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
          {loading ? <div className="p-3 text-sm text-slate-500">Loading team...</div> : null}
          {!loading && !members.length ? <div className="p-3 text-sm text-slate-500">No document members.</div> : null}
          {members.map((member) => (
            <div className="flex items-center justify-between gap-3 p-3" key={member.id}>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900">{member.user.full_name}</div>
                <div className="truncate text-xs font-medium text-slate-500">{member.user.email}</div>
                <div className="mt-1 text-xs font-bold uppercase text-blue-700">{member.role}</div>
              </div>
              {canManage && member.user_id !== currentUserId ? (
                <Button
                  aria-label={`Remove ${member.user.full_name}`}
                  disabled={removingUserId === member.user_id}
                  size="icon"
                  type="button"
                  variant="secondary"
                  onClick={() => removeMember(member)}
                >
                  {removingUserId === member.user_id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function upsertMember(members: EiaDocumentMember[], member: EiaDocumentMember) {
  const exists = members.some((item) => item.user_id === member.user_id);
  if (!exists) {
    return [...members, member];
  }
  return members.map((item) => (item.user_id === member.user_id ? member : item));
}
