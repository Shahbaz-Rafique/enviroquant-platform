"use client";

import { CheckCircle2, Loader2, MessageSquare, Reply } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import type { SubSectionComment, User } from "@/lib/types";

type CommentsPanelProps = {
  subsectionId: string;
  user: User;
  canComment: boolean;
  canResolve: boolean;
  onChanged?: () => void;
};

export function CommentsPanel({ subsectionId, user, canComment, canResolve, onChanged }: CommentsPanelProps) {
  const [comments, setComments] = useState<SubSectionComment[]>([]);
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      const data = await apiRequest<SubSectionComment[]>(`/eia-documents/subsections/${subsectionId}/comments`);
      setComments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comments could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [subsectionId]);

  useEffect(() => {
    loadComments();
    const timer = window.setInterval(loadComments, 10000);
    return () => window.clearInterval(timer);
  }, [loadComments]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createComment(content, null);
    setContent("");
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    await createComment(replyContent, parentId);
    setReplyContent("");
    setReplyingTo(null);
  }

  async function createComment(value: string, parentCommentId: string | null) {
    const trimmed = value.trim();
    if (!trimmed || !canComment) {
      return;
    }

    const optimisticComment = buildOptimisticComment(user, subsectionId, trimmed, parentCommentId);
    setComments((current) => insertComment(current, optimisticComment, parentCommentId));
    setSaving(true);
    setError(null);

    try {
      const saved = await apiRequest<SubSectionComment>(`/eia-documents/subsections/${subsectionId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content: trimmed,
          parent_comment_id: parentCommentId
        })
      });
      setComments((current) => replaceComment(current, optimisticComment.id, saved));
      onChanged?.();
    } catch (err) {
      setComments((current) => removeComment(current, optimisticComment.id));
      setError(err instanceof Error ? err.message : "Comment could not be saved");
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolved(comment: SubSectionComment) {
    if (!canResolve) {
      return;
    }
    const nextResolved = !comment.is_resolved;
    setComments((current) => updateCommentResolved(current, comment.id, nextResolved));
    try {
      await apiRequest<SubSectionComment>(`/eia-documents/subsections/${subsectionId}/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_resolved: nextResolved })
      });
      onChanged?.();
    } catch (err) {
      setComments((current) => updateCommentResolved(current, comment.id, comment.is_resolved));
      setError(err instanceof Error ? err.message : "Comment could not be updated");
    }
  }

  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <MessageSquare className="size-5 text-[#B6F7FF]" />
          Comments
        </span>
        <span className="text-sm font-semibold text-white/52">{countComments(comments)}</span>
      </div>

      <div className="grid gap-4 p-4">
        {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}

        <form className="grid gap-3" onSubmit={submitComment}>
          <Textarea
            className="min-h-24 resize-y"
            disabled={!canComment || saving}
            placeholder="Add a comment"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <Button disabled={!canComment || saving || !content.trim()} type="submit">
            {saving ? <Loader2 className="animate-spin" /> : <MessageSquare />}
            Comment
          </Button>
        </form>

        <div className="grid gap-3">
          {loading ? <Alert>Loading comments...</Alert> : null}
          {!loading && !comments.length ? <div className="text-sm text-white/52">No comments yet.</div> : null}
          {comments.map((comment) => (
            <CommentItem
              canComment={canComment}
              canResolve={canResolve}
              comment={comment}
              key={comment.id}
              replyingTo={replyingTo}
              replyContent={replyContent}
              saving={saving}
              onReplyContentChange={setReplyContent}
              onReplyStart={setReplyingTo}
              onResolve={toggleResolved}
              onSubmitReply={submitReply}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type CommentItemProps = {
  comment: SubSectionComment;
  canComment: boolean;
  canResolve: boolean;
  replyingTo: string | null;
  replyContent: string;
  saving: boolean;
  onReplyStart: (commentId: string | null) => void;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: (event: FormEvent<HTMLFormElement>, parentId: string) => void;
  onResolve: (comment: SubSectionComment) => void;
};

function CommentItem({
  comment,
  canComment,
  canResolve,
  replyingTo,
  replyContent,
  saving,
  onReplyStart,
  onReplyContentChange,
  onSubmitReply,
  onResolve
}: CommentItemProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{comment.user.full_name}</div>
          <div className="text-xs font-medium text-white/52">{formatDateTime(comment.created_at)}</div>
        </div>
        {comment.is_resolved ? (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-xs font-bold uppercase text-emerald-100">
            Resolved
          </span>
        ) : null}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/74">{comment.content}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={!canComment} size="sm" type="button" variant="secondary" onClick={() => onReplyStart(comment.id)}>
          <Reply />
          Reply
        </Button>
        {canResolve ? (
          <Button size="sm" type="button" variant="secondary" onClick={() => onResolve(comment)}>
            <CheckCircle2 />
            {comment.is_resolved ? "Reopen" : "Resolve"}
          </Button>
        ) : null}
      </div>

      {replyingTo === comment.id ? (
        <form className="mt-3 grid gap-2" onSubmit={(event) => onSubmitReply(event, comment.id)}>
          <Textarea
            className="min-h-20 resize-y"
            disabled={!canComment || saving}
            placeholder="Write a reply"
            value={replyContent}
            onChange={(event) => onReplyContentChange(event.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={!replyContent.trim() || saving} size="sm" type="submit">
              {saving ? <Loader2 className="animate-spin" /> : <Reply />}
              Reply
            </Button>
            <Button size="sm" type="button" variant="secondary" onClick={() => onReplyStart(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {comment.replies.length ? (
        <div className="mt-3 grid gap-3 border-l border-white/10 pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              canComment={canComment}
              canResolve={canResolve}
              comment={reply}
              key={reply.id}
              replyingTo={replyingTo}
              replyContent={replyContent}
              saving={saving}
              onReplyContentChange={onReplyContentChange}
              onReplyStart={onReplyStart}
              onResolve={onResolve}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function buildOptimisticComment(
  user: User,
  subsectionId: string,
  content: string,
  parentCommentId: string | null
): SubSectionComment {
  const now = new Date().toISOString();
  return {
    id: `temp-${Date.now()}`,
    tenant_id: user.tenant_id,
    subsection_id: subsectionId,
    user_id: user.id,
    parent_comment_id: parentCommentId,
    content,
    is_resolved: false,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status
    },
    replies: [],
    created_at: now,
    updated_at: now
  };
}

function insertComment(
  comments: SubSectionComment[],
  comment: SubSectionComment,
  parentCommentId: string | null
): SubSectionComment[] {
  if (!parentCommentId) {
    return [...comments, comment];
  }
  return comments.map((item) =>
    item.id === parentCommentId
      ? { ...item, replies: [...item.replies, comment] }
      : { ...item, replies: insertComment(item.replies, comment, parentCommentId) }
  );
}

function replaceComment(
  comments: SubSectionComment[],
  temporaryId: string,
  savedComment: SubSectionComment
): SubSectionComment[] {
  return comments.map((comment) =>
    comment.id === temporaryId
      ? savedComment
      : { ...comment, replies: replaceComment(comment.replies, temporaryId, savedComment) }
  );
}

function removeComment(comments: SubSectionComment[], commentId: string): SubSectionComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({ ...comment, replies: removeComment(comment.replies, commentId) }));
}

function updateCommentResolved(
  comments: SubSectionComment[],
  commentId: string,
  isResolved: boolean
): SubSectionComment[] {
  return comments.map((comment) =>
    comment.id === commentId
      ? { ...comment, is_resolved: isResolved }
      : { ...comment, replies: updateCommentResolved(comment.replies, commentId, isResolved) }
  );
}

function countComments(comments: SubSectionComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
