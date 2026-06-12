import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useListIntervenerColleagues,
  useReassignTicketN1,
  useReassignTicketN2,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Loader2 } from "lucide-react";

type ReassignTicketDialogProps = {
  ticketId: number;
  level: "n1" | "n2";
  roleLabel: string;
  onSuccess: () => void;
};

export function ReassignTicketDialog({ ticketId, level, roleLabel, onSuccess }: ReassignTicketDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>("");

  const { data: colleagues, isLoading: colleaguesLoading } = useListIntervenerColleagues({
    query: { enabled: open } as any,
  });
  const { mutate: reassignN1, isPending: reassigningN1 } = useReassignTicketN1();
  const { mutate: reassignN2, isPending: reassigningN2 } = useReassignTicketN2();
  const reassigning = reassigningN1 || reassigningN2;

  function handleConfirm() {
    const id = Number(targetUserId);
    if (!id) return;

    const onDone = {
      onSuccess: () => {
        setOpen(false);
        setTargetUserId("");
        onSuccess();
      },
      onError: () => toast({ title: "Impossible de transférer", variant: "destructive" }),
    };

    if (level === "n1") {
      reassignN1({ id: ticketId, data: { targetUserId: id } }, onDone);
    } else {
      reassignN2({ id: ticketId, data: { targetUserId: id } }, onDone);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setTargetUserId(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Transférer à un autre {roleLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transférer la demande</DialogTitle>
          <DialogDescription>
            Choisissez un collègue {roleLabel} qui prendra le relais sur cette demande.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reassign-colleague">Collègue</Label>
          {colleaguesLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : colleagues?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun autre collègue disponible.</p>
          ) : (
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger id="reassign-colleague">
                <SelectValue placeholder="Sélectionner un collègue…" />
              </SelectTrigger>
              <SelectContent>
                {colleagues?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirm}
            disabled={reassigning || !targetUserId || colleagues?.length === 0}
          >
            {reassigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmer le transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
