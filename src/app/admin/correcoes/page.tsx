"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { listarFichasPendentesRevisao } from "@/services/fichaCorrecao";
import type { FichaCorrecao } from "@/types/ficha-correcao";

export default function CorrecoesPage() {
  const [fichas, setFichas] = useState<FichaCorrecao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const lista = await listarFichasPendentesRevisao();
        setFichas(lista);
      } catch (error) {
        console.error("Erro ao carregar fichas:", error);
        toast.error("Não foi possível carregar as correções pendentes.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Correções pendentes de revisão</h1>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : fichas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma correção aguardando revisão no momento.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead>Nota final</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fichas.map((f) => {
              const ajustes = f.quantidadeAjustes ?? 0;
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.alunoNome}</TableCell>
                  <TableCell>{f.tutorNome}</TableCell>
                  <TableCell>{f.notaFinal} / 1000</TableCell>
                  <TableCell>
                    {ajustes > 0 ? (
                      <Badge variant="outline" className="border-amber-400 text-amber-700">
                        Reenviado (ajuste nº {ajustes})
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Primeira correção</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/correcoes/${f.id}`}>
                      <Button size="sm">Revisar</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </main>
  );
}