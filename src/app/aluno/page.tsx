"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { buscarTurma } from "@/services/turma";

export default function AlunoDashboard() {
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
          <h1 className="text-2xl font-semibold">Painel do Aluno</h1>
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
        <Link href="/aluno/tarefas">
          <Button variant="outline">Tarefas</Button>
        </Link>
        <Link href="/aluno/redacoes">
          <Button variant="outline">Minhas redações</Button>
        </Link>
        <Link href="/aluno/simulados">
  <Button variant="outline">Simulados</Button>
</Link>
<Link href="/aluno/caderno-erros">
  <Button variant="outline">Caderno de Erros</Button>
</Link>
<Link href="/aluno/estatisticas">
  <Button variant="outline">Estatísticas</Button>
</Link>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Quizzes aparecerão aqui em breve.
      </p>
    </main>
  );
}