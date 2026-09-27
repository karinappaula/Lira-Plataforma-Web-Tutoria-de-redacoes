"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { excluirQuestao, listarQuestoes } from "@/services/questoes";
import { Assunto, Dificuldade, Questao, Vestibular } from "@/types/questao";
import { ASSUNTOS, DIFICULDADES, VESTIBULARES } from "@/lib/constantesQuestoes";
import { QuestaoFormDialog } from "@/components/shared/QuestaoFormDialog";

const TODOS = "todos";

export default function BancoQuestoesPage() {
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [questaoEditando, setQuestaoEditando] = useState<Questao | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Filtros — tudo em memória, mesmo padrão do /admin/historico.
  const [filtroVestibular, setFiltroVestibular] = useState<string>(TODOS);
  const [filtroAno, setFiltroAno] = useState<string>(TODOS);
  const [filtroAssunto, setFiltroAssunto] = useState<string>(TODOS);
  const [filtroDificuldade, setFiltroDificuldade] = useState<string>(TODOS);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarQuestoes();
      setQuestoes(lista);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Erro ao carregar o banco de questões."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Anos disponíveis são calculados a partir do que já foi cadastrado —
  // não é uma lista fixa, já que `ano` é aberto por design (ver questao.ts).
  const anosDisponiveis = useMemo(() => {
    const anos = new Set(questoes.map((q) => q.ano));
    return Array.from(anos).sort((a, b) => b - a);
  }, [questoes]);

  const questoesFiltradas = useMemo(() => {
    return questoes.filter((q) => {
      if (filtroVestibular !== TODOS && q.vestibular !== filtroVestibular)
        return false;
      if (filtroAno !== TODOS && String(q.ano) !== filtroAno) return false;
      if (filtroAssunto !== TODOS && q.assunto !== filtroAssunto) return false;
      if (filtroDificuldade !== TODOS && q.dificuldade !== filtroDificuldade)
        return false;
      return true;
    });
  }, [questoes, filtroVestibular, filtroAno, filtroAssunto, filtroDificuldade]);

  const algumFiltroAtivo =
    filtroVestibular !== TODOS ||
    filtroAno !== TODOS ||
    filtroAssunto !== TODOS ||
    filtroDificuldade !== TODOS;

  function limparFiltros() {
    setFiltroVestibular(TODOS);
    setFiltroAno(TODOS);
    setFiltroAssunto(TODOS);
    setFiltroDificuldade(TODOS);
  }

  function handleNovaQuestao() {
    setQuestaoEditando(null);
    setDialogAberto(true);
  }

  function handleEditar(questao: Questao) {
    setQuestaoEditando(questao);
    setDialogAberto(true);
  }

  async function handleExcluir(questao: Questao) {
    const confirmado = window.confirm(
      `Excluir a questão ${questao.vestibular} ${questao.ano} nº ${questao.numeroQuestao}? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    setExcluindoId(questao.id);
    try {
      await excluirQuestao(questao.id);
      setQuestoes((prev) => prev.filter((q) => q.id !== questao.id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir a questão.");
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Banco de Questões</h1>
          <p className="text-sm text-muted-foreground">
            Questões de Língua Portuguesa — ENEM, FUVEST e UNICAMP
          </p>
        </div>
        <Button onClick={handleNovaQuestao}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Questão
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-muted/20 p-3">
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Vestibular
          </label>
          <Select value={filtroVestibular} onValueChange={setFiltroVestibular}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {VESTIBULARES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-32">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Ano
          </label>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {anosDisponiveis.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Assunto
          </label>
          <Select value={filtroAssunto} onValueChange={setFiltroAssunto}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {ASSUNTOS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Dificuldade
          </label>
          <Select value={filtroDificuldade} onValueChange={setFiltroDificuldade}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {DIFICULDADES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {algumFiltroAtivo && (
          <Button variant="ghost" size="sm" onClick={limparFiltros}>
            <X className="mr-1 h-4 w-4" />
            Limpar filtros
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {questoesFiltradas.length} de {questoes.length} questões
        </span>
      </div>

      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando questões...
        </div>
      ) : questoes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma questão cadastrada ainda. Clique em "Nova Questão" para
          começar.
        </div>
      ) : questoesFiltradas.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma questão encontrada com esses filtros.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vestibular</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Nº</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Dificuldade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questoesFiltradas.map((questao) => (
              <TableRow key={questao.id}>
                <TableCell>{questao.vestibular}</TableCell>
                <TableCell>{questao.ano}</TableCell>
                <TableCell>{questao.numeroQuestao}</TableCell>
                <TableCell>{questao.assunto}</TableCell>
                <TableCell>{questao.dificuldade}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditar(questao)}
                    aria-label="Editar questão"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExcluir(questao)}
                    disabled={excluindoId === questao.id}
                    aria-label="Excluir questão"
                  >
                    {excluindoId === questao.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <QuestaoFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        questaoEditando={questaoEditando}
        onSaved={carregar}
      />
    </div>
  );
}