"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { listarTentativasFinalizadas } from "@/services/tentativas";
import { Tentativa } from "@/types/tentativa";

const TODOS = "todos";

function formatarData(timestamp: { toDate: () => Date }): string {
  return timestamp.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}min ${String(s).padStart(2, "0")}s`;
}

function chaveDoMes(timestamp: { toDate: () => Date }): string {
  const data = timestamp.toDate();
  return `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
}

export default function HistoricoSimuladosPage() {
  const { usuario } = useAuth();
  const [tentativas, setTentativas] = useState<Tentativa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroMes, setFiltroMes] = useState<string>(TODOS);

  useEffect(() => {
    if (!usuario) return;
    const usuarioAtual = usuario;

    listarTentativasFinalizadas(usuarioAtual.uid)
      .then(setTentativas)
      .catch((e: unknown) => {
        console.error("Erro ao carregar histórico:", e);
        setErro(e instanceof Error ? e.message : "Erro ao carregar histórico.");
      })
      .finally(() => setCarregando(false));
  }, [usuario]);

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(
      tentativas.filter((t) => t.finishedAt).map((t) => chaveDoMes(t.finishedAt!))
    );
    return Array.from(meses).sort().reverse();
  }, [tentativas]);

  const tentativasFiltradas = useMemo(() => {
    if (filtroMes === TODOS) return tentativas;
    return tentativas.filter(
      (t) => t.finishedAt && chaveDoMes(t.finishedAt) === filtroMes
    );
  }, [tentativas, filtroMes]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Histórico de Simulados</h1>
          <p className="text-sm text-muted-foreground">
            Seus simulados anteriores. Clique em um para rever as questões.
          </p>
        </div>

        {mesesDisponiveis.length > 0 && (
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os meses</SelectItem>
              {mesesDisponiveis.map((mes) => (
                <SelectItem key={mes} value={mes}>
                  {mes}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando...
        </div>
      ) : tentativas.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          Você ainda não finalizou nenhum simulado.
        </div>
      ) : tentativasFiltradas.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhum simulado encontrado nesse mês.
        </div>
      ) : (
        <div className="space-y-3">
          {tentativasFiltradas.map((t) => (
            <Link
              key={t.id}
              href={`/aluno/simulados/${t.id}`}
              className="block rounded-md border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {t.quantidade} questões
                    {t.filtros.vestibular && ` · ${t.filtros.vestibular}`}
                    {t.filtros.ano && ` ${t.filtros.ano}`}
                    {t.filtros.assunto && ` · ${t.filtros.assunto}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.finishedAt && formatarData(t.finishedAt)}
                    {t.tempoGastoSegundos !== undefined &&
                      ` · ${formatarTempo(t.tempoGastoSegundos)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      (t.percentual ?? 0) >= 60
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {t.percentual}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.acertos} acertos · {t.erros} erros
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}