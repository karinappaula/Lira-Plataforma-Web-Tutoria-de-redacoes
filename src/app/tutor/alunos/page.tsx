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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { criarConvite } from "@/services/convite";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Usuario } from "@/types/usuario";

export default function AlunosPage() {
  const { usuario } = useAuth();
  const [alunos, setAlunos] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    if (!usuario) return;
    setCarregando(true);
    try {
      const q = query(
        collection(db, "usuarios"),
        where("tutorId", "==", usuario.uid)
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map(
        (d) => ({ uid: d.id, ...d.data() }) as Usuario
      );
      setAlunos(lista);
    } catch (error) {
      toast.error("Não foi possível carregar os alunos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [usuario]);

  async function handleConvidarAluno() {
    if (!usuario || !usuario.turmaId) {
      toast.error("Você precisa estar vinculado a uma turma para convidar alunos.");
      return;
    }

    try {
      const codigo = await criarConvite({
        role: "aluno",
        turmaId: usuario.turmaId,
        tutorId: usuario.uid,
        criadoPorAdminId: usuario.uid,
      });
      const link = `${window.location.origin}/convite/${codigo}`;

      try {
        await navigator.clipboard.writeText(link);
        toast.success("Link de convite copiado para a área de transferência!");
      } catch {
        toast.success(`Convite criado! Link: ${link}`);
      }
    } catch (error) {
      toast.error("Não foi possível gerar o convite.");
      console.error("Erro ao criar convite de aluno:", error);
    }
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meus alunos</h1>
          <p className="text-sm text-muted-foreground">
            {alunos.length} aluno(s) vinculado(s) a você
          </p>
        </div>
        <Button onClick={handleConvidarAluno}>+ Convidar aluno</Button>
      </div>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : alunos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum aluno vinculado ainda. Clique em "Convidar aluno" para gerar
          um link de cadastro.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cadastrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunos.map((aluno) => (
              <TableRow key={aluno.uid}>
                <TableCell className="font-medium">{aluno.nome}</TableCell>
                <TableCell>{aluno.email}</TableCell>
                <TableCell>
                  {new Date(aluno.criadoEm).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}