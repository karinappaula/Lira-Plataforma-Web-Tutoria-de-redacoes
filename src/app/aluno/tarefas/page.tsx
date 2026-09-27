"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { listarTarefasParaAluno, prazoExpirado } from "@/services/tarefa";
import { listarRedacoesDoAluno, criarRascunho } from "@/services/redacao";
import { TarefaDetalhesDialog } from "@/components/shared/TarefaDetalhesDialog";
import type { Tarefa } from "@/types/tarefa";
import type { Redacao } from "@/types/redacao";

type StatusTarefaAluno =
  | "nao_iniciada"
  | "rascunho"
  | "aguardando_correcao"
  | "em_revisao"
  | "concluida";

const ROTULOS_STATUS: Record<StatusTarefaAluno, string> = {
  nao_iniciada: "Não iniciada",
  rascunho: "Rascunho",
  aguardando_correcao: "Aguardando correção",
  em_revisao: "Em revisão",
  concluida: "Concluída",
};

function statusDaTarefa(redacao: Redacao | undefined): StatusTarefaAluno {
  if (!redacao) return "nao_iniciada";
  if (redacao.status === "rascunho") return "rascunho";
  if (redacao.status === "enviada" || redacao.status === "em_correcao") {
    return "aguardando_correcao";
  }
  if (
    redacao.status === "em_revisao_admin" ||
    redacao.status === "ajustes_solicitados"
  ) {
    return "em_revisao";
  }
  return "concluida";
}

function chaveMes(dataIso: string): string {
  const d = new Date(dataIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function TarefasAlunoPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [iniciando, setIniciando] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [tarefaDetalhes, setTarefaDetalhes] = useState<Tarefa | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!usuario?.tutorId) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const [listaTarefas, listaRedacoes] = await Promise.all([
          listarTarefasParaAluno(usuario.tutorId),
          listarRedacoesDoAluno(usuario.uid),
        ]);
        setTarefas(listaTarefas);
        setRedacoes(listaRedacoes);
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        toast.error("Não foi possível carregar as tarefas.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  function redacaoDaTarefa(tarefaId: string): Redacao | undefined {
    return redacoes.find((r) => r.tarefaId === tarefaId);
  }

  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set(tarefas.map((t) => chaveMes(t.prazo)));
    return Array.from(chaves).sort().reverse();
  }, [tarefas]);

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      const status = statusDaTarefa(redacaoDaTarefa(t.id));
      if (filtroStatus !== "todas" && status !== filtroStatus) return false;
      if (filtroMes !== "todos" && chaveMes(t.prazo) !== filtroMes) return false;
      return true;
    });
  }, [tarefas, redacoes, filtroStatus, filtroMes]);

  async function handleIniciar(tarefa: Tarefa) {
    if (!usuario?.tutorId) return;

    if (prazoExpirado(tarefa.prazo)) {
      toast.error("O prazo desta tarefa já encerrou.");
      return;
    }

    setIniciando(tarefa.id);
    try {
      const id = await criarRascunho({
        alunoId: usuario.uid,
        tutorId: usuario.tutorId,
        tema: tarefa.tema,
        tarefaId: tarefa.id,
      });
      router.push(`/aluno/redacoes/${id}`);
    } catch (error) {
      toast.error("Não foi possível iniciar a redação.");
      setIniciando(null);
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tarefas</h1>

        <div className="flex flex-wrap gap-3">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              {Object.entries(ROTULOS_STATUS).map(([valor, rotulo]) => (
                <SelectItem key={valor} value={valor}>
                  {rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Prazo (mês)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {mesesDisponiveis.map((chave) => (
                <SelectItem key={chave} value={chave}>
                  {rotuloMes(chave)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : tarefasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa encontrada para este filtro.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tarefasFiltradas.map((t) => {
                const redacaoVinculada = redacaoDaTarefa(t.id);
                const status = statusDaTarefa(redacaoVinculada);
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
                        {vencida && status !== "concluida" && (
                          <Badge variant="destructive" className="w-fit">
                            Prazo encerrado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        variant={status === "concluida" ? "default" : "secondary"}
                      >
                        {ROTULOS_STATUS[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTarefaDetalhes(t)}
                      >
                        Detalhes
                      </Button>
                      {redacaoVinculada ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/aluno/redacoes/${redacaoVinculada.id}`)
                          }
                        >
                          {redacaoVinculada.status === "rascunho"
                            ? "Continuar"
                            : "Ver"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleIniciar(t)}
                          disabled={iniciando === t.id || vencida}
                        >
                          {iniciando === t.id ? "Iniciando..." : "Escrever"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TarefaDetalhesDialog
        tarefa={tarefaDetalhes}
        open={tarefaDetalhes !== null}
        onOpenChange={(open) => !open && setTarefaDetalhes(null)}
      />
    </main>
  );
}