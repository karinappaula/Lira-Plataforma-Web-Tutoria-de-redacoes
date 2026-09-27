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
import { useAuth } from "@/hooks/useAuth";
import { listarFilaDoTutor, buscarRedacao } from "@/services/redacao";
import { listarFichasParaAjustar } from "@/services/fichaCorrecao";
import type { Redacao } from "@/types/redacao";

interface ItemAjuste {
  redacaoId: string;
  tema: string;
  quantidadeAjustes: number;
}

export default function FilaCorrecaoPage() {
  const { usuario } = useAuth();
  const [redacoes, setRedacoes] = useState<Redacao[]>([]);
  const [ajustes, setAjustes] = useState<ItemAjuste[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!usuario) return;
      setCarregando(true);
      try {
        const lista = await listarFilaDoTutor(usuario.uid);
        setRedacoes(lista);

        const fichasParaAjustar = await listarFichasParaAjustar(usuario.uid);
        const itens = await Promise.all(
          fichasParaAjustar.map(async (f) => {
            // Defensivo: se a redação referenciada foi apagada ou não
            // pode ser lida por algum motivo, não deixa a página inteira
            // quebrar — só mostra um rótulo genérico para este item.
            try {
              const red = await buscarRedacao(f.redacaoId);
              return {
                redacaoId: f.redacaoId,
                tema: red?.tema ?? "Redação (indisponível)",
                quantidadeAjustes: f.quantidadeAjustes ?? 1,
              };
            } catch {
              return {
                redacaoId: f.redacaoId,
                tema: "Redação (indisponível)",
                quantidadeAjustes: f.quantidadeAjustes ?? 1,
              };
            }
          })
        );
        setAjustes(itens);
      } catch (error) {
        console.error("Erro ao carregar fila:", error);
        toast.error("Não foi possível carregar a fila de correção.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Fila de correção</h1>

      {carregando ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          {ajustes.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-amber-700">
                Ajustes solicitados pelo Admin
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tema</TableHead>
                    <TableHead>Ajuste</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ajustes.map((a) => (
                    <TableRow key={a.redacaoId}>
                      <TableCell className="font-medium">{a.tema}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {a.quantidadeAjustes}ª solicitação
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/tutor/redacoes/${a.redacaoId}`}>
                          <Button size="sm" variant="outline">
                            Corrigir novamente
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold">Aguardando primeira correção</h2>
          {redacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma redação pendente de correção no momento.
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
                        {r.status === "enviada" ? "Aguardando" : "Em correção"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tutor/redacoes/${r.id}`}>
                        <Button size="sm">Corrigir</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </main>
  );
}