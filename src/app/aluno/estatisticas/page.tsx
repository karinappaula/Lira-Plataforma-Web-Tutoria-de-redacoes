"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  calcularDesempenhoPorAssunto,
  DesempenhoPorAssunto,
  listarTentativasFinalizadas,
} from "@/services/tentativas";
import {
  buscarEvolucaoRedacoes,
  EvolucaoCompetencias,
} from "@/services/estatisticasRedacao";

const NOMES_COMPETENCIA: Record<number, string> = {
  1: "C1",
  2: "C2",
  3: "C3",
  4: "C4",
  5: "C5",
};

export default function EstatisticasAlunoPage() {
  const { usuario } = useAuth();

  const [desempenho, setDesempenho] = useState<DesempenhoPorAssunto[]>([]);
  const [totalSimulados, setTotalSimulados] = useState(0);
  const [mediaGeral, setMediaGeral] = useState(0);

  const [evolucaoRedacoes, setEvolucaoRedacoes] = useState<EvolucaoCompetencias[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const usuarioAtual = usuario;

    async function carregar() {
      try {
        const [porAssunto, tentativas, evolucao] = await Promise.all([
          calcularDesempenhoPorAssunto(usuarioAtual.uid),
          listarTentativasFinalizadas(usuarioAtual.uid),
          buscarEvolucaoRedacoes(usuarioAtual.uid),
        ]);

        setDesempenho(porAssunto);
        setTotalSimulados(tentativas.length);
        setEvolucaoRedacoes(evolucao);

        if (tentativas.length > 0) {
          const soma = tentativas.reduce(
            (acc, t) => acc + (t.percentual ?? 0),
            0
          );
          setMediaGeral(Math.round(soma / tentativas.length));
        }
      } catch (e) {
        console.error("Erro ao carregar estatísticas:", e);
        setErro(
          e instanceof Error ? e.message : "Erro ao carregar estatísticas."
        );
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando estatísticas...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Minhas Estatísticas</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Seu desempenho em simulados e redações.
      </p>

      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* ---- SIMULADOS ---- */}
      {totalSimulados === 0 ? (
        <div className="mb-8 rounded-md border border-dashed border-border py-10 text-center text-muted-foreground">
          Faça seu primeiro simulado para ver estatísticas de questões aqui.
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-4 text-center">
              <p className="text-3xl font-bold">{totalSimulados}</p>
              <p className="text-xs text-muted-foreground">
                Simulados finalizados
              </p>
            </div>
            <div className="rounded-md border border-border p-4 text-center">
              <p className="text-3xl font-bold">{mediaGeral}%</p>
              <p className="text-xs text-muted-foreground">
                Aproveitamento médio
              </p>
            </div>
          </div>

          <h2 className="mb-3 text-lg font-semibold">Desempenho por assunto</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Do assunto com mais dificuldade para o de melhor desempenho.
          </p>
          <div className="mb-10 space-y-3">
            {desempenho.map((item) => (
              <div key={item.assunto}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.assunto}</span>
                  <span className="text-muted-foreground">
                    {item.acertos}/{item.total} ({item.percentual}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      item.percentual >= 60
                        ? "bg-emerald-500"
                        : "bg-destructive"
                    }`}
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- REDAÇÕES ---- */}
      <h2 className="mb-1 text-lg font-semibold">
        Evolução das Redações
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Notas por competência ao longo do tempo, da mais antiga para a mais
        recente.
      </p>

      {evolucaoRedacoes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-10 text-center text-muted-foreground">
          Nenhuma redação corrigida e aprovada ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-2 text-left font-medium">Data</th>
                {[1, 2, 3, 4, 5].map((c) => (
                  <th key={c} className="p-2 text-center font-medium">
                    {NOMES_COMPETENCIA[c]}
                  </th>
                ))}
                <th className="p-2 text-center font-medium">Final</th>
              </tr>
            </thead>
            <tbody>
              {evolucaoRedacoes.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="p-2">
                    {new Date(item.data).toLocaleDateString("pt-BR")}
                  </td>
                  {[1, 2, 3, 4, 5].map((c) => (
                    <td key={c} className="p-2 text-center">
                      {item.notasPorCompetencia[c as 1 | 2 | 3 | 4 | 5] ?? "—"}
                    </td>
                  ))}
                  <td className="p-2 text-center font-semibold">
                    {item.notaFinal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {evolucaoRedacoes.length >= 2 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Da primeira para a última redação aprovada, sua nota final foi de{" "}
          <strong>{evolucaoRedacoes[0].notaFinal}</strong> para{" "}
          <strong>
            {evolucaoRedacoes[evolucaoRedacoes.length - 1].notaFinal}
          </strong>
          .
        </p>
      )}

      <Link
        href="/aluno"
        className="mt-8 inline-block text-sm text-primary underline underline-offset-2"
      >
        Voltar para o Painel
      </Link>
    </div>
  );
}