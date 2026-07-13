import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { GeneralNotification } from '@/lib/types';

interface GeneralNotificationModalProps {
  notification: GeneralNotification;
  onRead: (id: string, version: number) => Promise<void>;
}

export default function GeneralNotificationModal({
  notification,
  onRead,
}: GeneralNotificationModalProps) {
  const [open, setOpen] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmRead = async () => {
    setConfirming(true);
    try {
      await onRead(notification.id, notification.version);
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen) {
      // If user closes the modal by clicking outside or clicking the close 'X'
      // it should mark as read.
      setOpen(false);
      await onRead(notification.id, notification.version);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] border border-primary/20 shadow-xl bg-card">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Info className="w-5 h-5 text-primary animate-bounce" />
            {notification.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto pr-2">
            {notification.message}
          </p>
        </div>
        <DialogFooter className="mt-2">
          <Button 
            onClick={handleConfirmRead} 
            className="w-full sm:w-auto"
            disabled={confirming}
          >
            {confirming ? 'Confirmando...' : 'Entendi / Confirmar Leitura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
