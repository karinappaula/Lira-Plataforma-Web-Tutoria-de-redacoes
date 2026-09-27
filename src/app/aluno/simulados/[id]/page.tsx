"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

import {
  buscarQuestoesPorIds,
  buscarTentativaPorId,
  finalizarTentativa,
  salvarProgresso,
} from "@/services/tentativas";
import {
  calcularIntervaloBloco,
  separarTextoCompartilhado,
} from "@/lib/agruparQuestoesPorTextoBase";
import { EnunciadoComImagem } from "@/components/shared/EnunciadoComImagem";
import { TextoFormatado } from "@/components/shared/TextoFormatado";
import { Alternativa, Questao } from "@/types/questao";
import { RespostaTentativa, Tentativa } from "@/types/tentativa";
import { ALTERNATIVAS } from "@/lib/constantesQuestoes";

function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function ResponderSimuladoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, Alternativa | null>>(
    {}
  );
  const [blocosExpandidos, setBlocosExpandidos] = useState<Set<number>>(
    new Set()
  );

  const [startTimeMillis, setStartTimeMillis] = useState<number | null>(null);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);

  const [finalizando, setFinalizando] = useState(false);
  const [resultado, setResultado] = useState<{
    acertos: number;
    erros: number;
    percentual: number;
    tempoGastoSegundos: number;
  } | null>(null);

  // Controla qual questão está expandida na tela de resultado/revisão.
  const [questaoExpandidaId, setQuestaoExpandidaId] = useState<string | null>(
    null
  );

  // Carrega a tentativa e as questões na ordem salva.
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErroCarregamento(null);
      try {
        const t = await buscarTentativaPorId(id);
        if (!t) {
          setErroCarregamento("Simulado não encontrado.");
          return;
        }
        const qs = await buscarQuestoesPorIds(t.questaoIds);

        setTentativa(t);
        setQuestoes(qs);

        const respostasIniciais: Record<string, Alternativa | null> = {};
        qs.forEach((q) => {
          const salva = t.respostas.find((r) => r.questaoId === q.id);
          respostasIniciais[q.id] = salva?.respostaAluno ?? null;
        });
        setRespostas(respostasIniciais);

        if (t.status === "finalizada") {
          setResultado({
            acertos: t.acertos ?? 0,
            erros: t.erros ?? 0,
            percentual: t.percentual ?? 0,
            tempoGastoSegundos: t.tempoGastoSegundos ?? 0,
          });
        } else {
          const millis = t.startTime.toMillis();
          setStartTimeMillis(millis);

          const primeiraNaoRespondida = qs.findIndex(
            (q) => respostasIniciais[q.id] === null
          );
          setIndiceAtual(primeiraNaoRespondida === -1 ? 0 : primeiraNaoRespondida);
        }
      } catch (e) {
        setErroCarregamento(
          e instanceof Error ? e.message : "Erro ao carregar o simulado."
        );
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  // Cronômetro progressivo — só roda enquanto a tentativa está em andamento.
  useEffect(() => {
    if (startTimeMillis === null || resultado !== null) return;

    const atualizar = () =>
      setTempoDecorrido(Math.floor((Date.now() - startTimeMillis) / 1000));

    atualizar();
    const intervalo = setInterval(atualizar, 1000);
    return () => clearInterval(intervalo);
  }, [startTimeMillis, resultado]);

  const questaoAtual = questoes[indiceAtual];
  const anterior = indiceAtual > 0 ? questoes[indiceAtual - 1] : null;

  const { compartilhado, unico } = useMemo(() => {
    if (!questaoAtual) return { compartilhado: "", unico: "" };
    return separarTextoCompartilhado(questaoAtual, anterior);
  }, [questaoAtual, anterior]);

  const intervaloBloco = useMemo(() => {
    if (questoes.length === 0) return null;
    return calcularIntervaloBloco(questoes, indiceAtual);
  }, [questoes, indiceAtual]);

  const ehPrimeiraDoBloco = intervaloBloco?.inicio === indiceAtual;
  const blocoTemMaisDeUma =
    intervaloBloco !== null && intervaloBloco.fim > intervaloBloco.inicio;

  const persistirProgresso = useCallback(
    (novasRespostas: Record<string, Alternativa | null>) => {
      if (!tentativa) return;
      const array: RespostaTentativa[] = questoes.map((q) => ({
        questaoId: q.id,
        respostaAluno: novasRespostas[q.id] ?? null,
        correta: novasRespostas[q.id] === q.respostaCorreta,
      }));
      salvarProgresso(tentativa.id, array).catch(() => {
        // Falha ao salvar progresso não deve travar o aluno respondendo;
        // a próxima resposta tenta salvar de novo.
      });
    },
    [tentativa, questoes]
  );

  function handleSelecionarResposta(alternativa: Alternativa) {
    if (!questaoAtual) return;
    setRespostas((prev) => {
      const novo = { ...prev, [questaoAtual.id]: alternativa };
      persistirProgresso(novo);
      return novo;
    });
  }

  function alternarBloco(indice: number) {
    setBlocosExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(indice)) novo.delete(indice);
      else novo.add(indice);
      return novo;
    });
  }

  async function handleFinalizar() {
    if (!tentativa || startTimeMillis === null) return;

    setFinalizando(true);
    try {
      const array: RespostaTentativa[] = questoes.map((q) => ({
        questaoId: q.id,
        respostaAluno: respostas[q.id] ?? null,
        correta: respostas[q.id] === q.respostaCorreta,
      }));

      const resultadoFinal = await finalizarTentativa(
        tentativa.id,
        array,
        questoes,
        tentativa.alunoId,
        startTimeMillis
      );

      setResultado(resultadoFinal);
    } catch (e) {
      setErroAcao(
        e instanceof Error ? e.message : "Erro ao finalizar o simulado."
      );
    } finally {
      setFinalizando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando simulado...
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erroCarregamento}
        </p>
      </div>
    );
  }

  // ------ TELA DE RESULTADO ------
  if (resultado) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Resultado do Simulado</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-md border border-border p-4 text-center">
            <p className="text-2xl font-bold">{resultado.percentual}%</p>
            <p className="text-xs text-muted-foreground">Aproveitamento</p>
          </div>
          <div className="rounded-md border border-border p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {resultado.acertos}
            </p>
            <p className="text-xs text-muted-foreground">Acertos</p>
          </div>
          <div className="rounded-md border border-border p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {resultado.erros}
            </p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
          <div className="rounded-md border border-border p-4 text-center">
            <p className="text-2xl font-bold">
              {formatarTempo(resultado.tempoGastoSegundos)}
            </p>
            <p className="text-xs text-muted-foreground">Tempo total</p>
          </div>
        </div>

        <h2 className="mt-8 mb-3 text-lg font-semibold">Revisão</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Clique em uma questão para ver o enunciado completo e a explicação.
        </p>
        <div className="space-y-3">
          {questoes.map((q) => {
            const respostaAluno = respostas[q.id];
            const acertou = respostaAluno === q.respostaCorreta;
            const expandida = questaoExpandidaId === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-md border text-sm ${
                  acertou ? "border-emerald-500/40" : "border-destructive/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setQuestaoExpandidaId(expandida ? null : q.id)
                  }
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div>
                    <p className="font-medium">
                      {q.vestibular} {q.ano} — Questão {q.numeroQuestao}
                    </p>
                    <p>
                      Sua resposta:{" "}
                      <strong>{respostaAluno ?? "não respondida"}</strong>
                      {" · "}
                      Correta: <strong>{q.respostaCorreta}</strong>
                    </p>
                  </div>
                  {expandida ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expandida && (
                  <div className="border-t border-border p-3">
                    <EnunciadoComImagem
                      enunciado={q.enunciado}
                      imagemUrl={q.imagemUrl}
                      className="mb-3 text-sm"
                    />

                    <div className="space-y-1.5">
                      {ALTERNATIVAS.map((letra) => {
                        const ehCorreta = letra === q.respostaCorreta;
                        const ehEscolhaDoAluno = letra === respostaAluno;
                        return (
                          <div
                            key={letra}
                            className={`flex gap-2 rounded-md border p-2 text-sm ${
                              ehCorreta
                                ? "border-emerald-500 bg-emerald-500/10"
                                : ehEscolhaDoAluno
                                ? "border-destructive bg-destructive/10"
                                : "border-border"
                            }`}
                          >
                            <span className="font-medium">{letra}</span>
                            <span>{q.alternativas[letra]}</span>
                          </div>
                        );
                      })}
                    </div>

                    {q.explicacao && (
                      <div className="mt-3 rounded-md bg-muted/30 p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Explicação:
                        </p>
                        <TextoFormatado
                          texto={q.explicacao}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => router.push("/aluno/simulados")}>
            Gerar novo simulado
          </Button>
          <Button variant="outline" onClick={() => router.push("/aluno")}>
            Voltar para o Painel
          </Button>
        </div>
      </div>
    );
  }

  // ------ TELA DE QUIZ ------
  if (!questaoAtual) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Questão {indiceAtual + 1} de {questoes.length}
        </span>
        <span className="font-mono">{formatarTempo(tempoDecorrido)}</span>
      </div>

      {ehPrimeiraDoBloco && blocoTemMaisDeUma && intervaloBloco && (
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          Texto para as Questões {questoes[intervaloBloco.inicio].numeroQuestao}{" "}
          a {questoes[intervaloBloco.fim].numeroQuestao}
        </p>
      )}

      {compartilhado && (
        <div className="mb-4 rounded-md border border-border">
          <button
            type="button"
            onClick={() => alternarBloco(indiceAtual)}
            className="flex w-full items-center gap-1 p-2 text-left text-sm text-muted-foreground"
          >
            {blocosExpandidos.has(indiceAtual) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Mesmo texto da questão anterior
          </button>
          {blocosExpandidos.has(indiceAtual) && (
            <div className="border-t border-border p-3">
              <EnunciadoComImagem
                enunciado={compartilhado}
                imagemUrl={questaoAtual.imagemUrl}
              />
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <EnunciadoComImagem
          enunciado={unico}
          imagemUrl={compartilhado ? null : questaoAtual.imagemUrl}
        />
      </div>

      <div className="space-y-2">
        {ALTERNATIVAS.map((letra) => {
          const selecionada = respostas[questaoAtual.id] === letra;
          return (
            <button
              key={letra}
              type="button"
              onClick={() => handleSelecionarResposta(letra)}
              className={`flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
                selecionada
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              <span className="font-medium">{letra}</span>
              <span>{questaoAtual.alternativas[letra]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          disabled={indiceAtual === 0}
          onClick={() => setIndiceAtual((i) => Math.max(0, i - 1))}
        >
          Anterior
        </Button>

        {indiceAtual < questoes.length - 1 ? (
          <Button onClick={() => setIndiceAtual((i) => i + 1)}>Próxima</Button>
        ) : (
          <Button onClick={handleFinalizar} disabled={finalizando}>
            {finalizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finalizar Simulado
          </Button>
        )}
      </div>

      {erroAcao && (
        <p className="mt-3 text-right text-sm text-destructive">{erroAcao}</p>
      )}
    </div>
  );
}