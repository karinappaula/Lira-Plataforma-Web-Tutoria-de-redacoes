"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { buscarRedacao, marcarEmCorrecao, marcarEmRevisaoAdmin } from "@/services/redacao";
import {
  criarFicha,
  buscarFicha,
  atualizarEReenviarFicha,
} from "@/services/fichaCorrecao";
import { buscarPerfilUsuario } from "@/services/auth";
import { buscarTurma } from "@/services/turma";
import { useAuth } from "@/hooks/useAuth";
import type { Redacao } from "@/types/redacao";
import type { FichaCorrecao, NotaCompetencia } from "@/types/ficha-correcao";

const COMPETENCIAS = [1, 2, 3, 4, 5] as const;

function notasIniciais(): NotaCompetencia[] {
  return COMPETENCIAS.map((c) => ({
    competencia: c,
    nota: 0,
    comentario: "",
  }));
}

export default function CorrigirRedacaoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAuth();

  const [redacao, setRedacao] = useState<Redacao | null>(null);
  const [nomeAluno, setNomeAluno] = useState<string>("");
  const [fichaExistente, setFichaExistente] = useState<FichaCorrecao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [notas, setNotas] = useState<NotaCompetencia[]>(notasIniciais());
  const [parecerGeral, setParecerGeral] = useState("");
  const [observacoesAdmin, setObservacoesAdmin] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const dados = await buscarRedacao(params.id);
      setRedacao(dados);
      setCarregando(false);

      if (!dados) return;

      const perfilAluno = await buscarPerfilUsuario(dados.alunoId);
      setNomeAluno(perfilAluno?.nome ?? "Aluno");

      if (dados.fichaCorrecaoId) {
        const ficha = await buscarFicha(dados.fichaCorrecaoId);
        setFichaExistente(ficha);
        if (ficha) {
          setNotas(ficha.notasCompetencias);
          setParecerGeral(ficha.parecerGeral);
          setObservacoesAdmin(ficha.observacoesAdmin ?? "");
        }
      } else if (dados.status === "enviada") {
        await marcarEmCorrecao(params.id);
      }
    }
    carregar();
  }, [params.id]);

  const notaFinal = notas.reduce((soma, n) => soma + n.nota, 0);

  function atualizarNota(competencia: number, campo: "nota" | "comentario", valor: string) {
    setNotas((atual) =>
      atual.map((n) =>
        n.competencia === competencia
          ? {
              ...n,
              [campo]: campo === "nota" ? Number(valor) : valor,
            }
          : n
      )
    );
  }

  async function handleEnviarCorrecao() {
    if (!usuario || !redacao) return;

    const notaInvalida = notas.some((n) => n.nota < 0 || n.nota > 200);
    if (notaInvalida) {
      toast.error("Cada competência deve ter nota entre 0 e 200.");
      return;
    }
    if (!parecerGeral.trim()) {
      toast.error("Escreva um parecer geral antes de enviar.");
      return;
    }

    setEnviando(true);
    try {
      if (fichaExistente) {
        await atualizarEReenviarFicha(fichaExistente.id, {
          notasCompetencias: notas,
          parecerGeral,
          ...(observacoesAdmin.trim() && { observacoesAdmin }),
        });
        await marcarEmRevisaoAdmin(redacao.id, fichaExistente.id);
        toast.success("Correção reenviada para revisão do administrador!");
      } else {
        const perfilAlunoCompleto = await buscarPerfilUsuario(redacao.alunoId);

        // A busca da turma é só um dado complementar (nome exibido no
        // histórico). Se falhar por qualquer motivo (ex: inconsistência
        // de permissão), não deve impedir o envio da correção.
        let turmaId: string | undefined;
        let turmaNome: string | undefined;
        if (perfilAlunoCompleto?.turmaId) {
          try {
            const turma = await buscarTurma(perfilAlunoCompleto.turmaId);
            if (turma) {
              turmaId = turma.id;
              turmaNome = turma.nome;
            }
          } catch (erroTurma) {
            console.warn("Não foi possível obter a turma do aluno:", erroTurma);
          }
        }

        const fichaId = await criarFicha({
          redacaoId: redacao.id,
          alunoId: redacao.alunoId,
          alunoNome: nomeAluno,
          tutorId: usuario.uid,
          tutorNome: usuario.nome,
          notasCompetencias: notas,
          parecerGeral,
          ...(turmaId && { turmaId, turmaNome }),
          ...(observacoesAdmin.trim() && { observacoesAdmin }),
        });
        await marcarEmRevisaoAdmin(redacao.id, fichaId);
        toast.success("Correção enviada para revisão do administrador!");
      }

      router.push("/tutor/redacoes");
    } catch (error) {
      console.error("Erro ao enviar correção:", error);
      toast.error("Não foi possível enviar a correção.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  if (!redacao) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Redação não encontrada.</p>
      </main>
    );
  }

  const numeroAjuste = fichaExistente?.quantidadeAjustes ?? 0;

  return (
    <main className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">{redacao.tema}</h1>
      <p className="mb-2 text-sm text-muted-foreground">
        Aluno: <span className="font-medium text-foreground">{nomeAluno}</span>
      </p>
      {fichaExistente && fichaExistente.status === "ajustes_solicitados" && (
        <Badge variant="secondary" className="mb-4">
          Ajuste solicitado pelo Admin {numeroAjuste > 1 ? `(${numeroAjuste}ª vez)` : ""} — revise e reenvie
        </Badge>
      )}

      {fichaExistente?.comentarioAjustesAdmin && (
        <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4">
          <h3 className="mb-1 font-medium">O que o Admin pediu para ajustar</h3>
          <p className="text-sm text-muted-foreground">
            {fichaExistente.comentarioAjustesAdmin}
          </p>
        </div>
      )}

      <div className="mb-8 rounded-lg border p-6">
        <p className="whitespace-pre-wrap font-serif text-base leading-relaxed">
          {redacao.texto}
        </p>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Ficha de correção</h2>

      <div className="mb-6 flex flex-col gap-4">
        {notas.map((n) => (
          <div key={n.competencia} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="font-medium">Competência {n.competencia}</Label>
              <Input
                type="number"
                min={0}
                max={200}
                step={20}
                value={n.nota}
                onChange={(e) =>
                  atualizarNota(n.competencia, "nota", e.target.value)
                }
                className="w-24"
              />
            </div>
            <Textarea
              placeholder="Comentário sobre esta competência..."
              value={n.comentario}
              onChange={(e) =>
                atualizarNota(n.competencia, "comentario", e.target.value)
              }
              rows={2}
            />
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">
          Nota final: <span className="text-lg">{notaFinal}</span> / 1000
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <Label htmlFor="parecer">Parecer geral do tutor</Label>
        <Textarea
          id="parecer"
          rows={4}
          value={parecerGeral}
          onChange={(e) => setParecerGeral(e.target.value)}
          placeholder="Comentário geral sobre a redação..."
        />
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <Label htmlFor="obsAdmin">
          Observações para o Admin (não visível ao aluno)
        </Label>
        <Textarea
          id="obsAdmin"
          rows={3}
          value={observacoesAdmin}
          onChange={(e) => setObservacoesAdmin(e.target.value)}
          placeholder="Opcional..."
        />
      </div>

      <Button onClick={handleEnviarCorrecao} disabled={enviando}>
        {enviando
          ? "Enviando..."
          : fichaExistente
          ? "Reenviar correção para o Admin"
          : "Enviar correção para o Admin"}
      </Button>
    </main>
  );
}