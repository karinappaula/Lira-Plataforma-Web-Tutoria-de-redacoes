"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  buscarFicha,
  aprovarFicha,
  solicitarAjustes,
} from "@/services/fichaCorrecao";
import {
  buscarRedacao,
  marcarRedacaoAprovada,
  marcarRedacaoAjustesSolicitados,
} from "@/services/redacao";
import type { FichaCorrecao } from "@/types/ficha-correcao";
import type { Redacao } from "@/types/redacao";

export default function RevisarFichaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [ficha, setFicha] = useState<FichaCorrecao | null>(null);
  const [redacao, setRedacao] = useState<Redacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [dialogAjusteAberto, setDialogAjusteAberto] = useState(false);
  const [comentarioAjuste, setComentarioAjuste] = useState("");

  useEffect(() => {
    async function carregar() {
      const dadosFicha = await buscarFicha(params.id);
      setFicha(dadosFicha);
      if (dadosFicha) {
        const dadosRedacao = await buscarRedacao(dadosFicha.redacaoId);
        setRedacao(dadosRedacao);
      }
      setCarregando(false);
    }
    carregar();
  }, [params.id]);

  async function handleAprovar() {
    if (!ficha) return;
    setProcessando(true);
    try {
      await aprovarFicha(ficha.id);
      await marcarRedacaoAprovada(ficha.redacaoId);
      toast.success("Ficha aprovada! O aluno já pode ver o resultado.");
      router.push("/admin/correcoes");
    } catch (error) {
      toast.error("Não foi possível aprovar a ficha.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleConfirmarAjustes() {
    if (!ficha) return;
    if (!comentarioAjuste.trim()) {
      toast.error("Descreva o que o tutor precisa ajustar.");
      return;
    }
    setProcessando(true);
    try {
      await solicitarAjustes(ficha.id, comentarioAjuste);
      await marcarRedacaoAjustesSolicitados(ficha.redacaoId);
      toast.success("Ajustes solicitados ao tutor.");
      setDialogAjusteAberto(false);
      router.push("/admin/correcoes");
    } catch (error) {
      toast.error("Não foi possível solicitar ajustes.");
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </main>
    );
  }

  if (!ficha || !redacao) {
    return (
      <main className="p-8">
        <p className="text-sm text-muted-foreground">Ficha não encontrada.</p>
      </main>
    );
  }

  const ajustes = ficha.quantidadeAjustes ?? 0;

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{redacao.tema}</h1>
        <p className="text-sm text-muted-foreground">
          Aluno: {ficha.alunoNome} · Tutor: {ficha.tutorNome}
        </p>
        {ajustes > 0 && (
          <Badge variant="outline" className="mt-2 border-amber-400 text-amber-700">
            Reenviado (ajuste nº {ajustes})
          </Badge>
        )}
      </div>

      <div className="mb-6 rounded-lg border p-6">
        <p className="whitespace-pre-wrap font-serif text-base leading-relaxed">
          {redacao.texto}
        </p>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Ficha de correção do tutor</h2>

      <div className="mb-6 flex flex-col gap-3">
        {ficha.notasCompetencias.map((n) => (
          <div key={n.competencia} className="rounded-lg border p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium">Competência {n.competencia}</span>
              <Badge variant="secondary">{n.nota} / 200</Badge>
            </div>
            {n.comentario && (
              <p className="text-sm text-muted-foreground">{n.comentario}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">
          Nota final: <span className="text-lg">{ficha.notaFinal}</span> / 1000
        </p>
      </div>

      <div className="mb-6">
        <h3 className="mb-1 font-medium">Parecer geral do tutor</h3>
        <p className="text-sm text-muted-foreground">{ficha.parecerGeral}</p>
      </div>

      {ficha.observacoesAdmin && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-1 font-medium">Observações do tutor para você</h3>
          <p className="text-sm text-muted-foreground">
            {ficha.observacoesAdmin}
          </p>
        </div>
      )}

      {ajustes > 0 && ficha.comentarioAjustesAdmin && (
        <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-4">
          <h3 className="mb-1 font-medium">
            Seu comentário anterior sobre o ajuste
          </h3>
          <p className="text-sm text-muted-foreground">
            {ficha.comentarioAjustesAdmin}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleAprovar} disabled={processando}>
          {processando ? "Processando..." : "Aprovar"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setDialogAjusteAberto(true)}
          disabled={processando}
        >
          Solicitar ajustes ao tutor
        </Button>
      </div>

      <Dialog open={dialogAjusteAberto} onOpenChange={setDialogAjusteAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajustes ao tutor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="comentarioAjuste">
              O que o tutor precisa ajustar?
            </Label>
            <Textarea
              id="comentarioAjuste"
              rows={4}
              value={comentarioAjuste}
              onChange={(e) => setComentarioAjuste(e.target.value)}
              placeholder="Ex: A nota da competência 3 está muito alta para os erros apontados no texto..."
            />
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmarAjustes} disabled={processando}>
              {processando ? "Enviando..." : "Confirmar e enviar ao tutor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}