import { useState } from 'react';
import { X, Archive, Forward, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { TransferDialog } from './TransferDialog';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onMarkAsRead: () => void;
  onTransfer: (type: 'agent' | 'queue', targetId: string, message?: string) => void;
  onArchive: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  onMarkAsRead,
  onTransfer,
  onArchive,
  onClearSelection,
  isLoading = false,
}: BulkActionsToolbarProps) {
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  if (selectedCount === 0) return null;

  const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    onTransfer(type, targetId, message);
    setShowTransferDialog(false);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-0 left-0 right-0 z-20 bg-primary/95 backdrop-blur-sm border-b border-primary-foreground/20 p-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearSelection}
                className="text-primary-foreground hover:bg-primary-foreground/20 w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAsRead}
                disabled={isLoading}
                className="text-primary-foreground hover:bg-primary-foreground/20 gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar como lido
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTransferDialog(true)}
                disabled={isLoading}
                className="text-primary-foreground hover:bg-primary-foreground/20 gap-2"
              >
                <Forward className="w-4 h-4" />
                Transferir
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onArchive}
                disabled={isLoading}
                className="text-primary-foreground hover:bg-primary-foreground/20 gap-2"
              >
                <Archive className="w-4 h-4" />
                Arquivar
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <TransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        onTransfer={handleTransfer}
      />
    </>
  );
}
