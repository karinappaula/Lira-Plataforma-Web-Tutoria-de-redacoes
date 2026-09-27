"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { criarRascunho, listarRedacoesDoAluno } from "@/services/redacao";
import type { Redacao, StatusRedacao } from "@/types/redacao";

const ROTULOS_STATUS: Record<StatusRedacao, string> = {
  rascunho: "Rascunho",
  enviada: "Aguardando tutor",
  em_correcao: "Em correção",
  corrigida: "Em correção",
  em_revisao_admin: "Em revisão final",
  aprovada: "Corrigida",
  ajustes_solicitados: "Em revisão final",
};

export default function RedacoesPage() {
  const { usuario } = useAuth();
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tema, setTema] = useState("");
  const [criando, setCriando] = useState(false);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    try {
      const lista = await listarRedacoesDoAluno(usuario.uid);
      setRedacoes(lista);
    } catch (error) {
      toast.error("Não foi possível carregar suas redações.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [usuario]);

  async function handleCriar(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    if (!usuario.tutorId) {
      toast.error(
        "Você ainda não tem um tutor vinculado. Fale com o administrador."
      );
      return;
    }

    setCriando(true);
    try {
      await criarRascunho({
        alunoId: usuario.uid,
        tutorId: usuario.tutorId,
        tema,
      });
      toast.success("Redação criada! Continue escrevendo.");
      setDialogAberto(false);
      setTema("");
      carregar();
    } catch (error) {
      toast.error("Não foi possível criar a redação.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Minhas redações</h1>
        <Button onClick={() => setDialogAberto(true)}>+ Nova redação</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : redacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma redação ainda. Clique em "Nova redação" para começar.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redacoes.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.tema}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ROTULOS_STATUS[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/aluno/redacoes/${r.id}`}>
                    <Button variant="outline" size="sm">
                      {r.status === "rascunho" ? "Continuar" : "Ver"}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova redação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tema">Tema da redação</Label>
              <Input
                id="tema"
                required
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: Os desafios da educação no Brasil"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={criando}>
                {criando ? "Criando..." : "Começar a escrever"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}