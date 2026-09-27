"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/firebase/config";
import {
  calcularDesempenhoPorAluno,
  calcularDesempenhoPorAssuntoGrupo,
  DesempenhoAluno,
  DesempenhoPorAssunto,
  listarTentativasFinalizadasVariosAlunos,
} from "@/services/tentativas";
import {
  calcularResumoRedacoesPorAluno,
  listarTodasRedacoesDoTutor,
  ResumoRedacoesAluno,
} from "@/services/redacao";
import type { Usuario } from "@/types/usuario";

export default function PainelSimuladosTutorPage() {
  const { usuario } = useAuth();

  const [alunos, setAlunos] = useState<Usuario[]>([]);
  const [desempenhoPorAluno, setDesempenhoPorAluno] = useState<DesempenhoAluno[]>([]);
  const [desempenhoPorAssunto, setDesempenhoPorAssunto] = useState<DesempenhoPorAssunto[]>([]);
  const [resumoRedacoes, setResumoRedacoes] = useState<ResumoRedacoesAluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const usuarioAtual = usuario;

    async function carregar() {
      try {
        const qAlunos = query(
          collection(db, "usuarios"),
          where("tutorId", "==", usuarioAtual.uid)
        );
        const snapAlunos = await getDocs(qAlunos);
        const listaAlunos = snapAlunos.docs.map(
          (d) => ({ uid: d.id, ...d.data() }) as Usuario
        );
        setAlunos(listaAlunos);

        if (listaAlunos.length === 0) {
          setCarregando(false);
          return;
        }

        const [tentativas, redacoes] = await Promise.all([
          listarTentativasFinalizadasVariosAlunos(
            listaAlunos.map((a) => a.uid)
          ),
          listarTodasRedacoesDoTutor(usuarioAtual.uid),
        ]);

        setDesempenhoPorAluno(calcularDesempenhoPorAluno(tentativas));
        setDesempenhoPorAssunto(
          await calcularDesempenhoPorAssuntoGrupo(tentativas)
        );
        setResumoRedacoes(calcularResumoRedacoesPorAluno(redacoes));
      } catch (e) {
        console.error("Erro ao carregar painel de simulados:", e);
        setErro(
          e instanceof Error ? e.message : "Erro ao carregar dados."
        );
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario]);

  function nomeDoAluno(alunoId: string): string {
    return alunos.find((a) => a.uid === alunoId)?.nome ?? "Aluno";
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">Desempenho em Simulados</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Visão geral dos seus tutorados nos simulados de Português.
      </p>

      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </p>
      )}

      {alunos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum aluno vinculado ainda.
        </p>
      ) : desempenhoPorAluno.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum dos seus tutorados finalizou um simulado ainda.
        </p>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">Por aluno</h2>
          <Table className="mb-10">
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-center">Simulados feitos</TableHead>
                <TableHead className="text-center">Aproveitamento médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desempenhoPorAluno
                .sort((a, b) => a.mediaGeral - b.mediaGeral)
                .map((d) => (
                  <TableRow key={d.alunoId}>
                    <TableCell className="font-medium">
                      {nomeDoAluno(d.alunoId)}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.totalSimulados}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          d.mediaGeral >= 60
                            ? "text-emerald-600 font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {d.mediaGeral}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          <h2 className="mb-3 text-lg font-semibold">
            Assuntos com mais dificuldade na turma
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Considerando todos os tutorados, do pior para o melhor
            aproveitamento.
          </p>
          <div className="mb-10 space-y-3">
            {desempenhoPorAssunto.map((item) => (
              <div key={item.assunto}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.assunto}</span>
                  <span className="text-muted-foreground">
                    {item.acertos}/{item.total} ({item.percentual}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      item.percentual >= 60
                        ? "bg-emerald-500"
                        : "bg-destructive"
                    }`}
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {resumoRedacoes.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Redações da turma</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead className="text-center">Enviadas</TableHead>
                <TableHead className="text-center">Pendentes de correção</TableHead>
                <TableHead className="text-center">Aprovadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoRedacoes.map((r) => (
                <TableRow key={r.alunoId}>
                  <TableCell className="font-medium">
                    {nomeDoAluno(r.alunoId)}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.totalEnviadas}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.pendentesCorrecao > 0 ? (
                      <span className="font-semibold text-amber-500">
                        {r.pendentesCorrecao}
                      </span>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.aprovadas}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </main>
  );
}