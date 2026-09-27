"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  listarTarefasDoTutor,
  removerTarefa,
  atualizarTarefa,
  prazoExpirado,
} from "@/services/tarefa";
import { listarTodasRedacoesDoTutor } from "@/services/redacao";
import { TarefaFormDialog } from "@/components/shared/TarefaFormDialog";
import { TarefaDetalhesDialog } from "@/components/shared/TarefaDetalhesDialog";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Tarefa } from "@/types/tarefa";
import type { Redacao } from "@/types/redacao";

export default function TarefasTutorPage() {
  const { usuario } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);
  const [tarefaEditandoPrazo, setTarefaEditandoPrazo] = useState<Tarefa | null>(null);
  const [novoPrazo, setNovoPrazo] = useState("");
  const [salvandoPrazo, setSalvandoPrazo] = useState(false);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    try {
      const [listaTarefas, listaRedacoes, alunosSnap] = await Promise.all([
        listarTarefasDoTutor(usuario.uid),
        listarTodasRedacoesDoTutor(usuario.uid),
        getDocs(
          query(collection(db, "usuarios"), where("tutorId", "==", usuario.uid))
        ),
      ]);
      setTarefas(listaTarefas);
      setRedacoes(listaRedacoes);
      setTotalAlunos(alunosSnap.size);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Não foi possível carregar as tarefas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [usuario]);

  function progressoDaTarefa(tarefaId: string) {
    const relacionadas = redacoes.filter((r) => r.tarefaId === tarefaId);
    const concluidas = relacionadas.filter((r) => r.status === "aprovada").length;
    const entregues = relacionadas.length;
    return { concluidas, entregues };
  }

  async function handleRemover(id: string) {
    if (!confirm("Remover esta tarefa? Os alunos não vão mais vê-la.")) return;
    try {
      await removerTarefa(id);
      toast.success("Tarefa removida.");
      carregar();
    } catch (error) {
      toast.error("Não foi possível remover a tarefa.");
    }
  }

  function abrirEdicaoPrazo(tarefa: Tarefa) {
    setTarefaEditandoPrazo(tarefa);
    setNovoPrazo(tarefa.prazo);
  }

  async function handleSalvarPrazo() {
    if (!tarefaEditandoPrazo) return;
    setSalvandoPrazo(true);
    try {
      await atualizarTarefa(tarefaEditandoPrazo.id, { prazo: novoPrazo });
      toast.success("Prazo atualizado.");
      setTarefaEditandoPrazo(null);
      carregar();
    } catch (error) {
      toast.error("Não foi possível atualizar o prazo.");
    } finally {
      setSalvandoPrazo(false);
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <Button onClick={() => setDialogAberto(true)}>+ Nova tarefa</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : tarefas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa criada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefas.map((t) => {
                const { concluidas, entregues } = progressoDaTarefa(t.id);
                const todosConcluiram =
                  totalAlunos > 0 && concluidas === totalAlunos;
                const vencida = prazoExpirado(t.prazo);

                return (
                  <TableRow key={t.id}>
                    <TableCell className="align-top font-medium">
                      {t.titulo}
                    </TableCell>
                    <TableCell className="align-top">{t.tema}</TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span>
                          {new Date(t.prazo).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {vencida && (
                          <Badge variant="destructive" className="w-fit">
                            Prazo encerrado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={todosConcluiram ? "default" : "secondary"}>
                        {concluidas} de {totalAlunos} concluíram
                      </Badge>
                      {entregues > concluidas && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entregues - concluidas} entregue(s) em correção/revisão
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTarefaDetalhes(t)}
                      >
                        Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirEdicaoPrazo(t)}
                      >
                        Editar prazo
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemover(t.id)}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TarefaFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSuccess={carregar}
      />

      <TarefaDetalhesDialog
        tarefa={tarefaDetalhes}
        open={tarefaDetalhes !== null}
        onOpenChange={(open) => !open && setTarefaDetalhes(null)}
      />

      <Dialog
        open={tarefaEditandoPrazo !== null}
        onOpenChange={(open) => !open && setTarefaEditandoPrazo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar prazo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="novoPrazo">Novo prazo (data e hora)</Label>
            <Input
              id="novoPrazo"
              type="datetime-local"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Definir uma data/hora futura reabre a tarefa para novos envios.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSalvarPrazo} disabled={salvandoPrazo}>
              {salvandoPrazo ? "Salvando..." : "Salvar novo prazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}