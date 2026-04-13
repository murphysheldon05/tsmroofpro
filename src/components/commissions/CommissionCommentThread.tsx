import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, MessageSquare } from "lucide-react";
import {
  useCommissionComments,
  useAddCommissionComment,
  useMarkCommissionCommentsRead,
  type CommissionComment,
} from "@/hooks/useCommissionComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatTimestampMST } from "@/lib/commissionPayDateCalculations";

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  rejection_note: {
    label: "Rejection Note",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  },
  revision_note: {
    label: "Revision Note",
    className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  },
  reply: {
    label: "Reply",
    className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface CommissionCommentThreadProps {
  commissionId: string;
  readOnly?: boolean;
  printMode?: boolean;
}

export function CommissionCommentThread({
  commissionId,
  readOnly = false,
  printMode = false,
}: CommissionCommentThreadProps) {
  const { user, isAdmin, userDepartment } = useAuth();
  const { data: comments, isLoading } = useCommissionComments(commissionId);
  const addComment = useAddCommissionComment();
  const markRead = useMarkCommissionCommentsRead();
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAccountingUser = userDepartment === "Accounting";
  const canReply = !readOnly && !printMode && !isAccountingUser;

  useEffect(() => {
    if (comments && comments.length > 0 && !printMode) {
      markRead.mutate(commissionId);
    }
  }, [comments?.length, commissionId]);

  useEffect(() => {
    if (bottomRef.current && !printMode) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments?.length]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text) return;
    await addComment.mutateAsync({
      commissionId,
      commentText: text,
      commentType: "reply",
    });
    setReplyText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    if (printMode) return null;
    return (
      <div className="text-center py-6">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No notes or messages yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={printMode ? "space-y-3" : "space-y-3 max-h-[400px] overflow-y-auto pr-1"}>
        {comments.map((comment) => (
          <CommentBubble
            key={comment.id}
            comment={comment}
            isOwnMessage={comment.user_id === user?.id}
            printMode={printMode}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {canReply && (
        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="Type a reply... (Ctrl+Enter to send)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!replyText.trim() || addComment.isPending}
            className="shrink-0 self-end"
          >
            {addComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function CommentBubble({
  comment,
  isOwnMessage,
  printMode,
}: {
  comment: CommissionComment;
  isOwnMessage: boolean;
  printMode: boolean;
}) {
  const typeConfig = TYPE_CONFIG[comment.comment_type] || TYPE_CONFIG.reply;

  return (
    <div className={`flex gap-3 ${isOwnMessage && !printMode ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs bg-muted">
          {getInitials(comment.user_name || "?")}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 min-w-0 ${isOwnMessage && !printMode ? "text-right" : ""}`}>
        <div className={`flex items-center gap-2 mb-1 flex-wrap ${isOwnMessage && !printMode ? "justify-end" : ""}`}>
          <span className="text-sm font-medium">{comment.user_name}</span>
          {comment.comment_type !== "reply" && (
            <Badge variant="outline" className={`text-[10px] py-0 ${typeConfig.className}`}>
              {typeConfig.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatTimestampMST(comment.created_at)}
          </span>
        </div>
        <div
          className={`inline-block rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
            comment.comment_type === "rejection_note"
              ? "bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800"
              : comment.comment_type === "revision_note"
                ? "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                : isOwnMessage && !printMode
                  ? "bg-primary/10 text-foreground"
                  : "bg-muted text-foreground"
          }`}
        >
          {comment.comment_text}
        </div>
      </div>
    </div>
  );
}
