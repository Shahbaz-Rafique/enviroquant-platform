"use client";

import { ShieldCheck, UserRound, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EiaAssignmentUserSummary, EiaDocumentMember } from "@/lib/types";

const avatarTones = [
  "bg-[#dff2e8] text-[#236c4a]",
  "bg-[#e8eef9] text-[#385b91]",
  "bg-[#f7ead8] text-[#9a6429]",
  "bg-[#f3e5ef] text-[#8b4b77]",
  "bg-[#e5f1f4] text-[#347182]",
];

export function CollaboratorStack({
  currentUserId,
  inverse = false,
  members,
  max = 7,
}: Readonly<{
  currentUserId?: string;
  inverse?: boolean;
  members: EiaDocumentMember[];
  max?: number;
}>) {
  const visible = members.slice(0, max);
  const remaining = Math.max(0, members.length - visible.length);

  return (
    <div className="flex items-center gap-2" aria-label={`${members.length} document collaborators`}>
      <div className="flex -space-x-2">
        {visible.map((member) => (
          <UserAvatar
            active={member.user_id === currentUserId}
            key={member.user_id}
            name={member.user.full_name}
            title={`${member.user.full_name} · ${roleLabel(member.role)}`}
          />
        ))}
        {remaining ? (
          <span className="relative grid size-8 place-items-center rounded-full border-2 border-white bg-[#edf2ef] text-[10px] font-bold text-[#52675e]">
            +{remaining}
          </span>
        ) : null}
      </div>
      <span className={cn("hidden text-xs font-semibold sm:block", inverse ? "text-white/70" : "text-[#6b7d75]")}>
        {members.length ? `${members.length} collaborator${members.length === 1 ? "" : "s"}` : "No collaborators"}
      </span>
    </div>
  );
}

export function AssigneeChip({
  assignee,
  className,
  inverse = false,
  role,
}: Readonly<{
  assignee: EiaAssignmentUserSummary | null;
  className?: string;
  inverse?: boolean;
  role: string;
}>) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <UserAvatar name={assignee?.full_name ?? "Unassigned"} size="sm" />
      <span className="min-w-0">
        <strong className={cn("block truncate text-xs font-semibold", inverse ? "text-white" : "text-[#344f44]")}>
          {assignee?.full_name ?? "Unassigned"}
        </strong>
        <span className={cn("block text-[10px] font-medium uppercase tracking-wide", inverse ? "text-white/70" : "text-[#7a8a83]")}>
          {roleLabel(role)}
        </span>
      </span>
    </span>
  );
}

export function ResponsibilityCard({
  assignee,
  role,
}: Readonly<{
  assignee: EiaAssignmentUserSummary | null;
  role: string;
}>) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-[#d7e5de] bg-white px-3 py-2 shadow-sm">
      <UserAvatar name={assignee?.full_name ?? "Unassigned"} />
      <div className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#7a8a83]">
          Responsible now
        </span>
        <strong className="block truncate text-sm text-[#24463a]">{assignee?.full_name ?? "Unassigned"}</strong>
        <span className="block text-[11px] text-[#687b72]">{roleLabel(role)}</span>
      </div>
      {assignee ? <ShieldCheck className="size-4 shrink-0 text-[#287451]" /> : <Users className="size-4 shrink-0 text-amber-500" />}
    </div>
  );
}

function UserAvatar({
  active = false,
  name,
  size = "md",
  title,
}: Readonly<{
  active?: boolean;
  name: string;
  size?: "sm" | "md";
  title?: string;
}>) {
  const tone = avatarTones[hashName(name) % avatarTones.length];
  const initials = getInitials(name);
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-2 border-white font-bold shadow-sm",
        size === "sm" ? "size-6 text-[8px]" : "size-8 text-[10px]",
        tone,
      )}
      title={title ?? name}
    >
      {name === "Unassigned" ? <UserRound className={size === "sm" ? "size-3" : "size-4"} /> : initials}
      {active ? (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" aria-label="You" />
      ) : null}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function hashName(name: string) {
  return [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function roleLabel(role: string) {
  if (role === "AUTHOR") return "Author";
  if (role === "REVIEWER") return "Reviewer";
  if (role === "AUTHOR_AND_REVIEWER") return "Author & reviewer";
  if (role === "EDITOR") return "Specialist / author";
  if (role === "COMMENTER") return "Commenter";
  if (role === "VIEWER") return "Viewer";
  if (role === "UNASSIGNED") return "Needs assignment";
  return role.replaceAll("_", " ").toLowerCase();
}
