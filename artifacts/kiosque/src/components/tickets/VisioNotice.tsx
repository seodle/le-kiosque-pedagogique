import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { formatVisioDateTime } from "@/lib/ticket-status";

type VisioNoticeProps = {
  link: string;
  scheduledAt?: string | null;
};

export function VisioNotice({ link, scheduledAt }: VisioNoticeProps) {
  return (
    <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="pt-4 pb-4 flex items-start gap-3">
        <Video className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Session en visio programmée</p>
          {scheduledAt && (
            <p className="text-sm text-blue-700 dark:text-blue-300">{formatVisioDateTime(scheduledAt)}</p>
          )}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline break-all"
          >
            {link}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
