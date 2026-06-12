import { cn } from "@/lib/utils";

type ChatMessageProps = {
  content: string;
  createdAt: string;
  senderType?: string;
  messageType?: string;
  staffLabel?: string;
  /** Vue enseignant : ses messages à droite. Vue staff : ses messages à droite. */
  perspective?: "teacher" | "staff";
};

export function ChatMessage({
  content,
  createdAt,
  senderType,
  messageType,
  staffLabel = "Personne ressource",
  perspective = "staff",
}: ChatMessageProps) {
  const role = senderType ?? "system";
  const isSystem = role === "system" || messageType === "webex";
  const isTeacher = role === "teacher";
  const isOwn = perspective === "teacher" ? isTeacher : !isTeacher;

  if (isSystem) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-line">
        {content}
        <p className="text-xs mt-2 text-blue-700/80 dark:text-blue-300/80">
          {new Date(createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 max-w-[85%]",
        isOwn ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted",
      )}
    >
      <p className="text-xs font-medium mb-1 opacity-70">
        {isTeacher ? "Enseignant" : staffLabel}
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
      <p className={cn("text-xs mt-1.5", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {new Date(createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
