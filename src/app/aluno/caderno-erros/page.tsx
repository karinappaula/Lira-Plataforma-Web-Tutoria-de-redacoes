"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  buscarQuestoesPorIds,
  gerarSimuladoAPartirDeIds,
  listarCadernoErros,
} from "@/services/tentativas";
import { Questao } from "@/types/questao";

interface ItemCaderno {
  questao: Questao;
  quantidadeErros: number;
}

export default function CadernoErrosPage() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [itens, setItens] = useState<ItemCaderno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

    useEffect(() => {
    if (!usuario) return;
    const usuarioAtual = usuario;

    async function carregar() {
      try {
        const registros = await listarCadernoErros(usuarioAtual.uid);
        if (registros.length === 0) {
          setItens([]);
          return;
        }

        const questoes = await buscarQuestoesPorIds(
          registros.map((r) => r.questaoId)
        );
        const mapaErros = new Map(
          registros.map((r) => [r.questaoId, r.quantidadeErros])
        );

        const combinados = questoes
          .map((q) => ({
            questao: q,
            quantidadeErros: mapaErros.get(q.id) ?? 0,
          }))
          .sort((a, b) => b.quantidadeErros - a.quantidadeErros);

        setItens(combinados);
      } catch (e) {
        console.error("Erro ao carregar caderno de erros:", e);
        setErro(
          e instanceof Error ? e.message : "Erro ao carregar caderno de erros."
        );
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  async function handleRefazer() {
    if (!usuario || !usuario.turmaId || itens.length === 0) return;

    setGerando(true);
    try {
      const tentativaId = await gerarSimuladoAPartirDeIds(
        itens.map((i) => i.questao.id),
        { uid: usuario.uid, nome: usuario.nome, turmaId: usuario.turmaId }
      );
      router.push(`/aluno/simulados/${tentativaId}`);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Erro ao gerar simulado de revisão."
      );
      setGerando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Caderno de Erros</h1>
          <p className="text-sm text-muted-foreground">
            Questões que você já errou pelo menos uma vez.
          </p>
        </div>
        {itens.length > 0 && (
          <Button onClick={handleRefazer} disabled={gerando}>
            {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refazer questões erradas
          </Button>
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
      ) : itens.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhuma questão errada por aqui — continue assim!
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map(({ questao, quantidadeErros }) => (
            <div
              key={questao.id}
              className="flex items-center justify-between rounded-md border border-border p-4"
            >
              <div>
                <p className="font-medium">
                  {questao.vestibular} {questao.ano} — Questão{" "}
                  {questao.numeroQuestao}
                </p>
                <p className="text-xs text-muted-foreground">
                  {questao.assunto}
                </p>
              </div>
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                Errou {quantidadeErros}x
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}