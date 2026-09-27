"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { buscarTurma } from "@/services/turma";

export default function TutorDashboard() {
  const { usuario, sair } = useAuth();
  const [nomeTurma, setNomeTurma] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!usuario?.turmaId) return;
      try {
        const turma = await buscarTurma(usuario.turmaId);
        setNomeTurma(turma?.nome ?? null);
      } catch (error) {
        console.warn("Não foi possível obter a turma:", error);
      }
    }
    carregar();
  }, [usuario]);

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Painel do Tutor</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {usuario?.nome}
            {nomeTurma && ` · Turma: ${nomeTurma}`}
          </p>
        </div>
        <Button variant="outline" onClick={sair}>
          Sair
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/tutor/alunos">
          <Button variant="outline">Meus alunos</Button>
        </Link>
        <Link href="/tutor/tarefas">
          <Button variant="outline">Tarefas</Button>
        </Link>
        <Link href="/tutor/redacoes">
          <Button variant="outline">Fila de correção</Button>
        </Link>
        <Link href="/tutor/historico">
          <Button variant="outline">Histórico</Button>
        </Link>
        <Link href="/tutor/simulados">
  <Button variant="outline">Desempenho em Simulados</Button>
</Link>
      </div>
    </main>
  );
}