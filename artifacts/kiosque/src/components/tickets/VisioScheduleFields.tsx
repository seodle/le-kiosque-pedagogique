import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIME_SLOTS = Array.from({ length: (20 - 8) * 4 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultVisioDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateInputValue(date);
}

export function combineVisioSchedule(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const scheduled = new Date(`${date}T${time}`);
  return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

function formatPreview(date: string, time: string): string | null {
  const scheduled = combineVisioSchedule(date, time);
  if (!scheduled) return null;
  return scheduled.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type VisioScheduleFieldsProps = {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

export function VisioScheduleFields({ date, time, onDateChange, onTimeChange }: VisioScheduleFieldsProps) {
  const preview = formatPreview(date, time);
  const minDate = formatDateInputValue(new Date());

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="visio-date">Date</Label>
          <Input
            id="visio-date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visio-time">Heure</Label>
          <Select value={time} onValueChange={onTimeChange}>
            <SelectTrigger id="visio-time">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot} value={slot}>{slot.replace(":", " h ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {preview && (
        <p className="text-sm text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
          Session prévue le {preview}
        </p>
      )}
    </div>
  );
}
