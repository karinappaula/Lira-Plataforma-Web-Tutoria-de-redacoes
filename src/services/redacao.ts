import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Redacao } from "@/types/redacao";

const COLECAO = "redacoes";

interface CriarRascunhoParams {
  alunoId: string;
  tutorId: string;
  tema: string;
  tarefaId?: string;
}

export async function criarRascunho(params: CriarRascunhoParams): Promise<string> {
  const ref = await addDoc(collection(db, COLECAO), {
    alunoId: params.alunoId,
    tutorId: params.tutorId,
    tema: params.tema,
    temaPropostoPeloAluno: !params.tarefaId,
    texto: "",
    status: "rascunho",
    criadaEm: new Date().toISOString(),
    ...(params.tarefaId !== undefined && { tarefaId: params.tarefaId }),
  });
  return ref.id;
}

export async function buscarRedacao(id: string): Promise<Redacao | null> {
  const snap = await getDoc(doc(db, COLECAO, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Redacao;
}

export async function listarRedacoesDoAluno(alunoId: string): Promise<Redacao[]> {
  const q = query(
    collection(db, COLECAO),
    where("alunoId", "==", alunoId),
    orderBy("criadaEm", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Redacao);
}

export async function listarFilaDoTutor(tutorId: string): Promise<Redacao[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    where("status", "in", ["enviada", "em_correcao"]),
    orderBy("enviadaEm", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Redacao);
}

function sanitizarTexto(texto: string): string {
  return texto.replace(/<[^>]*>/g, "");
}

export async function salvarRascunho(id: string, texto: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), {
    texto: sanitizarTexto(texto),
  });
}

export async function enviarRedacao(id: string, texto: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), {
    texto: sanitizarTexto(texto),
    status: "enviada",
    enviadaEm: new Date().toISOString(),
  });
}

export async function marcarEmCorrecao(id: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), {
    status: "em_correcao",
  });
}

export async function marcarEmRevisaoAdmin(
  id: string,
  fichaCorrecaoId: string
): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), {
    status: "em_revisao_admin",
    fichaCorrecaoId,
  });
}

export async function marcarRedacaoAprovada(id: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), { status: "aprovada" });
}

export async function marcarRedacaoAjustesSolicitados(id: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), { status: "ajustes_solicitados" });
}
/**
 * Todas as redações de um tutor, em qualquer status — usado para calcular
 * o progresso de conclusão das tarefas (quantos alunos já entregaram/tiveram
 * a redação aprovada para uma tarefa específica).
 */
export async function listarTodasRedacoesDoTutor(
  tutorId: string
): Promise<Redacao[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    orderBy("criadaEm", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Redacao);
}
export interface ResumoRedacoesAluno {
  alunoId: string;
  totalEnviadas: number;
  pendentesCorrecao: number;
  aprovadas: number;
}

/**
 * Agrega, por aluno, quantas redações já foram enviadas (ignorando
 * rascunhos, que ainda não saíram das mãos do aluno), quantas estão em
 * algum ponto do fluxo de correção, e quantas já foram aprovadas.
 * Usado no Painel do Tutor.
 */
export function calcularResumoRedacoesPorAluno(
  redacoes: Redacao[]
): ResumoRedacoesAluno[] {
  const agregados = new Map<string, ResumoRedacoesAluno>();

  redacoes.forEach((r) => {
    if (r.status === "rascunho") return;

    const atual = agregados.get(r.alunoId) ?? {
      alunoId: r.alunoId,
      totalEnviadas: 0,
      pendentesCorrecao: 0,
      aprovadas: 0,
    };

    atual.totalEnviadas += 1;
    if (["enviada", "em_correcao", "em_revisao_admin"].includes(r.status)) {
      atual.pendentesCorrecao += 1;
    }
    if (r.status === "aprovada") {
      atual.aprovadas += 1;
    }

    agregados.set(r.alunoId, atual);
  });

  return Array.from(agregados.values());
}