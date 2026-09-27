"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { criarTurma, atualizarTurma } from "@/services/turma";
import type { Turma } from "@/types/turma";

interface TurmaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaEditando?: Turma | null;
  onSuccess: () => void;
}

const VESTIBULARES = ["ENEM", "FUVEST", "UNICAMP", "OUTRO"] as const;

export function TurmaFormDialog({
  open,
  onOpenChange,
  turmaEditando,
  onSuccess,
}: TurmaFormDialogProps) {
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [vestibularFoco, setVestibularFoco] =
    useState<(typeof VESTIBULARES)[number]>("ENEM");
  const [salvando, setSalvando] = useState(false);

  const editando = Boolean(turmaEditando);

  useEffect(() => {
    if (turmaEditando) {
      setNome(turmaEditando.nome);
      setAnoLetivo(turmaEditando.anoLetivo);
      setVestibularFoco(turmaEditando.vestibularFoco);
    } else {
      setNome("");
      setAnoLetivo(new Date().getFullYear());
      setVestibularFoco("ENEM");
    }
  }, [turmaEditando, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    setSalvando(true);
    try {
      if (editando && turmaEditando) {
        await atualizarTurma(turmaEditando.id, {
          nome,
          anoLetivo,
          vestibularFoco,
        });
        toast.success("Turma atualizada.");
      } else {
        await criarTurma({
          nome,
          anoLetivo,
          vestibularFoco,
          adminId: usuario.uid,
          tutorIds: [],
        });
        toast.success("Turma criada.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível salvar a turma.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar turma" : "Nova turma"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome da turma</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: 3ºA"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="anoLetivo">Ano letivo</Label>
            <Input
              id="anoLetivo"
              type="number"
              required
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vestibularFoco">Foco de vestibular</Label>
            <Select
              value={vestibularFoco}
              onValueChange={(v) =>
                setVestibularFoco(v as (typeof VESTIBULARES)[number])
              }
            >
              <SelectTrigger id="vestibularFoco">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VESTIBULARES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}