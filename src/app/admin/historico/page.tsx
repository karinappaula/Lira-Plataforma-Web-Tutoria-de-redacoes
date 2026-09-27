"use client";

import { useEffect, useMemo, useState } from "react";
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
import { listarHistoricoCompleto } from "@/services/fichaCorrecao";
import type { FichaCorrecao, StatusFicha } from "@/types/ficha-correcao";

const ROTULOS_STATUS: Record<StatusFicha, string> = {
  enviada: "Aguardando revisão",
  aprovada: "Aprovada",
  ajustes_solicitados: "Ajuste solicitado",
  arquivada: "Arquivada",
};

function chaveMes(dataIso: string): string {
  const d = new Date(dataIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default function HistoricoAdminPage() {
  const [fichas, setFichas] = useState<FichaCorrecao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroTutor, setFiltroTutor] = useState<string>("todos");
  const [filtroTurma, setFiltroTurma] = useState<string>("todas");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const lista = await listarHistoricoCompleto();
        setFichas(lista);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        toast.error("Não foi possível carregar o histórico.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set(fichas.map((f) => chaveMes(f.criadaEm)));
    return Array.from(chaves).sort().reverse();
  }, [fichas]);

  const tutoresDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    fichas.forEach((f) => mapa.set(f.tutorId, f.tutorNome));
    return Array.from(mapa.entries());
  }, [fichas]);

  const turmasDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    fichas.forEach((f) => {
      if (f.turmaId && f.turmaNome) mapa.set(f.turmaId, f.turmaNome);
    });
    return Array.from(mapa.entries());
  }, [fichas]);

  const fichasFiltradas = useMemo(() => {
    return fichas.filter((f) => {
      if (filtroMes !== "todos" && chaveMes(f.criadaEm) !== filtroMes) return false;
      if (filtroTutor !== "todos" && f.tutorId !== filtroTutor) return false;
      if (filtroTurma !== "todas" && f.turmaId !== filtroTurma) return false;
      return true;
    });
  }, [fichas, filtroMes, filtroTutor, filtroTurma]);

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Histórico geral de correções</h1>
          <p className="text-sm text-muted-foreground">
            {fichasFiltradas.length} correção(ões)
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Mês" />
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

          <Select value={filtroTutor} onValueChange={setFiltroTutor}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tutor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tutores</SelectItem>
              {tutoresDisponiveis.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroTurma} onValueChange={setFiltroTurma}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmasDisponiveis.map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : fichasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma correção encontrada para este filtro.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Nota final</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ajustes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fichasFiltradas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.alunoNome}</TableCell>
                <TableCell>{f.turmaNome ?? "—"}</TableCell>
                <TableCell>{f.tutorNome}</TableCell>
                <TableCell>
                  {new Date(f.criadaEm).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{f.notaFinal} / 1000</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ROTULOS_STATUS[f.status]}
                  </Badge>
                </TableCell>
                <TableCell>{f.quantidadeAjustes ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}