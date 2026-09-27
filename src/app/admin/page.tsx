"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { usuario, sair } = useAuth();

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Painel do Administrador</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {usuario?.nome}
          </p>
        </div>
        <Button variant="outline" onClick={sair}>
          Sair
        </Button>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/turmas">
          <Button variant="outline">Turmas</Button>
        </Link>
        <Link href="/admin/correcoes">
          <Button variant="outline">Correções pendentes</Button>
        </Link>
        <Link href="/admin/historico">
          <Button variant="outline">Histórico geral</Button>
        </Link>
        <Link href="/admin/banco-questoes">
  <Button variant="outline">Banco de Questões</Button>
</Link>
      </div>
    </main>
  );
}