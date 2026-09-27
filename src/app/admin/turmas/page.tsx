"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TurmaFormDialog } from "@/components/shared/TurmaFormDialog";
import { listarTurmas, removerTurma } from "@/services/turma";
import { criarConvite } from "@/services/convite";
import { useAuth } from "@/hooks/useAuth";
import type { Turma } from "@/types/turma";

export default function TurmasPage() {
  const { usuario } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [turmaEditando, setTurmaEditando] = useState<Turma | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const lista = await listarTurmas();
      setTurmas(lista);
    } catch (error) {
      toast.error("Não foi possível carregar as turmas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovaTurma() {
    setTurmaEditando(null);
    setDialogAberto(true);
  }

  function abrirEdicao(turma: Turma) {
    setTurmaEditando(turma);
    setDialogAberto(true);
  }

  async function handleRemover(id: string) {
    if (!confirm("Remover esta turma?")) return;
    try {
      await removerTurma(id);
      toast.success("Turma removida.");
      carregar();
    } catch (error) {
      toast.error("Não foi possível remover a turma.");
    }
  }

  async function handleConvidarTutor(turmaId: string) {
    console.log("CLIQUEI, turmaId:", turmaId);
    console.log("usuario atual:", usuario);

    if (!usuario) {
      toast.error("Usuário não identificado. Recarregue a página.");
      return;
    }

    try {
      const codigo = await criarConvite({
        role: "tutor",
        turmaId,
        criadoPorAdminId: usuario.uid,
      });
      console.log("Convite criado com código:", codigo);

      const link = `${window.location.origin}/convite/${codigo}`;

      try {
        await navigator.clipboard.writeText(link);
        toast.success("Link de convite copiado para a área de transferência!");
      } catch {
        // Clipboard pode falhar por permissão do navegador — não é crítico,
        // mostramos o link para cópia manual.
        toast.success(`Convite criado! Link: ${link}`);
      }
    } catch (error) {
      console.error("ERRO ao criar convite:", error);
      toast.error("Não foi possível gerar o convite.");
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Turmas</h1>
        <Button onClick={abrirNovaTurma}>+ Nova turma</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma turma cadastrada ainda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ano letivo</TableHead>
              <TableHead>Foco</TableHead>
              <TableHead>Tutores</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turmas.map((turma) => (
              <TableRow key={turma.id}>
                <TableCell className="font-medium">{turma.nome}</TableCell>
                <TableCell>{turma.anoLetivo}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{turma.vestibularFoco}</Badge>
                </TableCell>
                <TableCell>{turma.tutorIds.length}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleConvidarTutor(turma.id)}
                  >
                    Convidar tutor
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicao(turma)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemover(turma.id)}
                  >
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TurmaFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        turmaEditando={turmaEditando}
        onSuccess={carregar}
      />
    </main>
  );
}
