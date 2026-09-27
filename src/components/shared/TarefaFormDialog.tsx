"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buscarTurma } from "@/services/turma";
import { criarTarefa } from "@/services/tarefa";

interface TarefaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TarefaFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: TarefaFormDialogProps) {
  const { usuario } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    if (!usuario.turmaId) {
      toast.error("Você precisa estar vinculado a uma turma para criar tarefas.");
      return;
    }

    setSalvando(true);
    try {
      const turma = await buscarTurma(usuario.turmaId);

      await criarTarefa({
        tutorId: usuario.uid,
        tutorNome: usuario.nome,
        turmaId: usuario.turmaId,
        turmaNome: turma?.nome ?? "Turma",
        titulo,
        tema,
        prazo,
        ...(descricao.trim() && { descricao }),
      });

      toast.success("Tarefa criada e enviada aos seus alunos.");
      setTitulo("");
      setTema("");
      setDescricao("");
      setPrazo("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      toast.error("Não foi possível criar a tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título da tarefa</Label>
            <Input
              id="titulo"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Redação da semana"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tema">Tema da redação</Label>
            <Input
              id="tema"
              required
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Os desafios da educação no Brasil"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Instruções (opcional)</Label>
            <Textarea
              id="descricao"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Orientações adicionais para os alunos..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prazo">Prazo (data e hora)</Label>
            <Input
              id="prazo"
              type="datetime-local"
              required
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Após esse horário, os alunos não conseguirão mais enviar a
              redação — a menos que você edite o prazo depois.
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}