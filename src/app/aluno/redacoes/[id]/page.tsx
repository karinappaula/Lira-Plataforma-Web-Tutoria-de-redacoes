"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  buscarRedacao,
  salvarRascunho,
  enviarRedacao,
} from "@/services/redacao";
import { buscarFicha } from "@/services/fichaCorrecao";
import type { Redacao } from "@/types/redacao";
import type { FichaCorrecao } from "@/types/ficha-correcao";
import { buscarTarefa, prazoExpirado } from "@/services/tarefa";

// Estimativa baseada na folha de resposta do ENEM: ~70 caracteres por linha,
// 30 linhas no total. É uma aproximação (linhas reais na tela dependem de
// fonte/largura), mas serve como referência prática para o aluno.
const CARACTERES_POR_LINHA_ENEM = 70;
const LINHAS_MAXIMAS_ENEM = 30;

const ROTULOS_STATUS_DETALHE: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Aguardando tutor",
  em_correcao: "Em correção",
  corrigida: "Em correção",
  em_revisao_admin: "Em revisão final",
  aprovada: "Corrigida",
  ajustes_solicitados: "Em revisão final",
};

export default function EditorRedacaoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [redacao, setRedacao] = useState<Redacao | null>(null);
  const [ficha, setFicha] = useState<FichaCorrecao | null>(null);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const dados = await buscarRedacao(params.id);
      setRedacao(dados);
      setTexto(dados?.texto ?? "");

      if (dados?.fichaCorrecaoId) {
        try {
          const dadosFicha = await buscarFicha(dados.fichaCorrecaoId);
          setFicha(dadosFicha);
        } catch {
          setFicha(null);
        }
      }

      setCarregando(false);
    }
    carregar();
  }, [params.id]);

  // Só o rascunho pode ser editado. Assim que o aluno envia para correção
  // (status "enviada"), o texto trava imediatamente — não é preciso esperar
  // o tutor abrir a tela de correção para bloquear a edição.
  const editavel = redacao?.status === "rascunho";
  const fichaAprovada =
    redacao?.status === "aprovada" && ficha?.status === "aprovada";

  const contagem = useMemo(() => {
    const palavras =
      texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
    const linhasEstimadas = Math.ceil(
      texto.length / CARACTERES_POR_LINHA_ENEM
    );
    return { palavras, linhasEstimadas };
  }, [texto]);

  const ultrapassouLimiteEnem =
    contagem.linhasEstimadas > LINHAS_MAXIMAS_ENEM;

  async function handleSalvarRascunho() {
    if (!redacao) return;
    setSalvando(true);
    try {
      await salvarRascunho(redacao.id, texto);
      toast.success("Rascunho salvo.");
    } catch (error) {
      toast.error("Não foi possível salvar o rascunho.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleEnviar() {
    if (!redacao) return;

    if (redacao.tarefaId) {
      const tarefa = await buscarTarefa(redacao.tarefaId);
      if (tarefa && prazoExpirado(tarefa.prazo)) {
        toast.error(
          "O prazo desta tarefa já encerrou. Peça ao tutor para reabrir o prazo."
        );
        return;
      }
    }

    if (texto.trim().length < 50) {
      toast.error(
        "Escreva um pouco mais antes de enviar (mínimo 50 caracteres)."
      );
      return;
    }
    if (
      !confirm(
        "Enviar redação para correção? Não será mais possível editar."
      )
    ) {
      return;
    }
    setEnviando(true);
    try {
      await enviarRedacao(redacao.id, texto);
      toast.success("Redação enviada para correção!");
      router.push("/aluno/redacoes");
    } catch (error) {
      toast.error("Não foi possível enviar a redação.");
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
        <p className="text-sm text-muted-foreground">
          Redação não encontrada.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{redacao.tema}</h1>
          <Badge variant="secondary" className="mt-1">
            {ROTULOS_STATUS_DETALHE[redacao.status]}
          </Badge>
        </div>
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={!editavel}
        rows={20}
        className="mb-2 font-serif text-base leading-relaxed"
        placeholder="Comece a escrever sua redação aqui..."
      />

      {editavel && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {contagem.palavras} palavras · ~{contagem.linhasEstimadas} linhas
            (estimativa)
          </span>
          <span>Modelo ENEM: até 30 linhas</span>
        </div>
      )}

      {editavel && ultrapassouLimiteEnem && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Você já passou de ~30 linhas (limite da folha do ENEM). Pode continuar
          escrevendo, mas fique atento: no exame real, o texto não pode
          ultrapassar 30 linhas.
        </p>
      )}

      {!editavel && !ficha && (
        <p className="mb-4 text-sm text-muted-foreground">
          Esta redação já está em processo de correção e não pode mais ser
          editada.
        </p>
      )}

      {editavel && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSalvarRascunho}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button onClick={handleEnviar} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar para correção"}
          </Button>
        </div>
      )}

      {ficha && fichaAprovada && (
        <div className="mt-8 border-t pt-6">
          <h2 className="mb-4 text-lg font-semibold">
            Resultado da correção
          </h2>

          <div className="mb-4 flex flex-col gap-3">
            {ficha.notasCompetencias.map((n) => (
              <div key={n.competencia} className="rounded-lg border p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">
                    Competência {n.competencia}
                  </span>
                  <Badge variant="secondary">{n.nota} / 200</Badge>
                </div>
                {n.comentario && (
                  <p className="text-sm text-muted-foreground">
                    {n.comentario}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">
              Nota final:{" "}
              <span className="text-lg">{ficha.notaFinal}</span> / 1000
            </p>
          </div>

          <div>
            <h3 className="mb-1 font-medium">Parecer do tutor</h3>
            <p className="text-sm text-muted-foreground">
              {ficha.parecerGeral}
            </p>
          </div>
        </div>
      )}

      {ficha && !fichaAprovada && !editavel && (
        <p className="mt-6 text-sm text-muted-foreground">
          Sua redação está sendo revisada. O resultado aparecerá aqui assim que
          for aprovado.
        </p>
      )}
    </main>
  );
}