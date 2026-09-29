"use client";

import { Copy, Loader2, Power, PowerOff, RefreshCcw, UserPlus, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { hasAnyRole } from "@/lib/permissions";
import type { User, UserInvitation } from "@/lib/types";

type TeamMembersProps = {
  user: User;
};

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "REVIEWER", label: "Reviewer" }
];

export function TeamMembers({ user }: TeamMembersProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState("CONSULTANT");
  const canInvite = hasAnyRole(user, ["owner", "admin"]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await apiRequest<User[]>("/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Team members could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setSaving(true);
    setError(null);
    setInviteUrl(null);
    setEmailSent(null);
    try {
      const invitation = await apiRequest<UserInvitation>("/users/invite", {
        method: "POST",
        body: JSON.stringify({
          full_name: String(form.get("full_name") ?? ""),
          email: String(form.get("email") ?? ""),
          role: inviteRole
        })
      });
      setInviteUrl(invitation.invite_url);
      setEmailSent(invitation.email_sent);
      formElement.reset();
      setInviteRole("CONSULTANT");
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation could not be created");
    } finally {
      setSaving(false);
    }
  }

  async function copyInviteUrl() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
  }

  async function updateMemberStatus(member: User, nextStatus: "active" | "inactive") {
    setUpdatingUserId(member.id);
    setError(null);
    try {
      const updatedMember = await apiRequest<User>(`/users/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setMembers((current) =>
        current.map((existingMember) =>
          existingMember.id === updatedMember.id ? updatedMember : existingMember
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "User status could not be updated");
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <>
      <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#67E8F9]">Organization access</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Team Members</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66">
            Invite admins, project managers, consultants, and reviewers into the current organization boundary.
          </p>
        </div>
        <Button variant="secondary" onClick={loadMembers}>
          <RefreshCcw />
          Refresh
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {canInvite ? (
          <section className="builder-panel">
            <div className="builder-section-title flex items-center gap-2">
              <UserPlus className="size-5 text-[#B6F7FF]" />
              Invite Member
            </div>
            <form className="grid gap-4 p-5" onSubmit={submit}>
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required minLength={2} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Send Invite
              </Button>
            </form>
          </section>
        ) : null}

        <section className="builder-panel">
          <div className="builder-section-title flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Users className="size-5 text-[#B6F7FF]" />
              Members
            </span>
            <span className="text-sm font-medium text-white/52">{members.length} users</span>
          </div>
          <div className="p-5">
            {error ? <Alert className="mb-4 border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
            {inviteUrl ? (
              <Alert className="mb-4 border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                <div className="grid gap-3">
                  <span className="font-semibold">Invitation created. Share this activation link:</span>
                  {emailSent ? (
                    <span>The invitation email was sent.</span>
                  ) : (
                    <span>Email was not sent. Use the activation link below.</span>
                  )}
                  <div className="flex min-w-0 gap-2">
                    <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                    <Button type="button" variant="secondary" size="icon" onClick={copyInviteUrl} aria-label="Copy invite link">
                      <Copy />
                    </Button>
                  </div>
                </div>
              </Alert>
            ) : null}
            {loading ? <Alert>Loading team members...</Alert> : null}
            {!loading && !members.length ? <Alert>No team members found.</Alert> : null}
            {!loading && members.length ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/[0.03] text-xs uppercase text-white/52">
                      <tr>
                        <th className="px-4 py-3 font-bold">Name</th>
                        <th className="px-4 py-3 font-bold">Email</th>
                        <th className="px-4 py-3 font-bold">Role</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3 font-semibold text-white">{member.full_name}</td>
                          <td className="px-4 py-3 text-white/66">{member.email}</td>
                          <td className="px-4 py-3 text-white/74">{member.role}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-xs font-bold uppercase text-white/74">
                              {member.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {member.id === user.id ? (
                              <span className="text-xs font-semibold text-white/52">Current user</span>
                            ) : member.status === "active" ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={updatingUserId === member.id}
                                onClick={() => updateMemberStatus(member, "inactive")}
                              >
                                {updatingUserId === member.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <PowerOff />
                                )}
                                Deactivate
                              </Button>
                            ) : member.status === "inactive" ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={updatingUserId === member.id}
                                onClick={() => updateMemberStatus(member, "active")}
                              >
                                {updatingUserId === member.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <Power />
                                )}
                                Activate
                              </Button>
                            ) : (
                              <span className="text-xs font-semibold text-white/52">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
