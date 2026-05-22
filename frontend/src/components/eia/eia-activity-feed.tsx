"use client";

import { FileText, MessageSquare, Paperclip, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { EiaActivityItem } from "@/lib/types";

type EiaActivityFeedProps = {
  activity: EiaActivityItem[];
};

export function EiaActivityFeed({ activity }: EiaActivityFeedProps) {
  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span>Activity</span>
        <Badge>{activity.length}</Badge>
      </div>
      <div className="grid max-h-[26rem] gap-1 overflow-y-auto p-3">
        {!activity.length ? <div className="p-2 text-sm text-slate-500">No recent activity.</div> : null}
        {activity.map((item) => {
          const Icon = iconForActivity(item.type);
          return (
            <div className="flex items-start gap-3 rounded-sm p-2 hover:bg-slate-50" key={item.id}>
              <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-sm bg-slate-100 text-slate-700">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{item.title}</div>
                <div className="line-clamp-2 text-xs font-medium text-slate-600">{item.description}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.actor?.full_name ?? "System"} - {formatDateTime(item.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function iconForActivity(type: EiaActivityItem["type"]) {
  if (type === "comment" || type === "comment_resolved") {
    return MessageSquare;
  }
  if (type === "attachment_uploaded") {
    return Paperclip;
  }
  if (type === "member_added") {
    return UserPlus;
  }
  return FileText;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
