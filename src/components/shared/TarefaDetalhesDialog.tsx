"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Tarefa } from "@/types/tarefa";

interface TarefaDetalhesDialogProps {
  tarefa: Tarefa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TarefaDetalhesDialog({
  tarefa,
  open,
  onOpenChange,
}: TarefaDetalhesDialogProps) {
  if (!tarefa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tarefa.titulo}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tema</p>
            <p className="text-sm">{tarefa.tema}</p>
          </div>

          {tarefa.descricao && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Instruções
              </p>
              <p className="whitespace-pre-wrap text-sm">{tarefa.descricao}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Prazo</p>
            <Badge variant="secondary">
              {new Date(tarefa.prazo).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}