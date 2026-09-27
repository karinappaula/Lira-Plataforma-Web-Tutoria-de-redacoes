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
import { useAuth } from "@/hooks/useAuth";
import { listarHistoricoDoTutor } from "@/services/fichaCorrecao";
import type { FichaCorrecao, StatusFicha } from "@/types/ficha-correcao";

const ROTULOS_STATUS: Record<StatusFicha, string> = {
  enviada: "Aguardando revisão do Admin",
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

export default function HistoricoTutorPage() {
  const { usuario } = useAuth();
  const [fichas, setFichas] = useState<FichaCorrecao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  useEffect(() => {
    async function carregar() {
      if (!usuario) return;
      setCarregando(true);
      try {
        const lista = await listarHistoricoDoTutor(usuario.uid);
        setFichas(lista);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        toast.error("Não foi possível carregar o histórico.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  const mesesDisponiveis = useMemo(() => {
    const chaves = new Set(fichas.map((f) => chaveMes(f.criadaEm)));
    return Array.from(chaves).sort().reverse();
  }, [fichas]);

  const fichasFiltradas = useMemo(() => {
    if (filtroMes === "todos") return fichas;
    return fichas.filter((f) => chaveMes(f.criadaEm) === filtroMes);
  }, [fichas, filtroMes]);

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Histórico de correções</h1>
          <p className="text-sm text-muted-foreground">
            {fichasFiltradas.length} correção(ões)
          </p>
        </div>

        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por mês" />
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