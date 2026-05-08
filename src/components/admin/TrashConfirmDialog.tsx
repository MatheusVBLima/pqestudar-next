import { useState, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";

interface TrashConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  mode: "trash" | "purge" | "restore";
  isLoading?: boolean;
}

export default function TrashConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  mode,
  isLoading = false,
}: TrashConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setConfirmText("");
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const isConfirmEnabled = mode === "restore" || confirmText.toLowerCase() === "excluir";

  const handleConfirm = async () => {
    if (!isConfirmEnabled || isLoading) return;
    await onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && isConfirmEnabled) {
      handleConfirm();
    }
  };

  const getDialogContent = () => {
    switch (mode) {
      case "trash":
        return {
          title: "Enviar para Lixeira",
          description: (
            <>
              <p className="mb-4">
                Você está prestes a enviar <strong>"{title}"</strong> para a lixeira.
              </p>
              <Alert variant="default" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>O que vai acontecer:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>O item será despublicado imediatamente</li>
                    <li>A URL pública deixará de responder (404)</li>
                    <li>O item será removido de todas as listagens públicas</li>
                    <li>Você poderá restaurar ou excluir definitivamente depois</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          ),
          confirmLabel: "Enviar para Lixeira",
          confirmVariant: "destructive" as const,
          icon: <Trash2 className="h-4 w-4 mr-2" />,
          requireConfirmation: true,
        };

      case "purge":
        return {
          title: "Excluir Definitivamente",
          description: (
            <>
              <p className="mb-4">
                Você está prestes a excluir <strong>"{title}"</strong> definitivamente.
              </p>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>⚠️ Esta ação é irreversível!</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>O item será removido permanentemente</li>
                    <li>Todas as fontes e atualizações associadas serão excluídas</li>
                    <li>O slug ficará disponível para reutilização</li>
                    <li>Não será possível desfazer esta ação</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          ),
          confirmLabel: "Excluir Definitivamente",
          confirmVariant: "destructive" as const,
          icon: <Trash2 className="h-4 w-4 mr-2" />,
          requireConfirmation: true,
        };

      case "restore":
        return {
          title: "Restaurar Item",
          description: (
            <>
              <p className="mb-4">
                Você está prestes a restaurar <strong>"{title}"</strong>.
              </p>
              <Alert className="mb-4">
                <AlertDescription className="text-sm">
                  <strong>O que vai acontecer:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>O item voltará para a lista de ativos</li>
                    <li>O item permanecerá como rascunho (não publicado)</li>
                    <li>Você precisará publicar manualmente se desejar</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          ),
          confirmLabel: "Restaurar",
          confirmVariant: "default" as const,
          icon: <RotateCcw className="h-4 w-4 mr-2" />,
          requireConfirmation: false,
        };
    }
  };

  const content = getDialogContent();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {mode === "trash" || mode === "purge" ? (
              <Trash2 className="h-5 w-5 text-destructive" />
            ) : (
              <RotateCcw className="h-5 w-5 text-primary" />
            )}
            {content.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left">{content.description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {content.requireConfirmation && (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Digite <strong>"excluir"</strong> para confirmar:
            </Label>
            <Input
              ref={inputRef}
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="excluir"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
        )}

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant={content.confirmVariant}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              content.icon
            )}
            {content.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
