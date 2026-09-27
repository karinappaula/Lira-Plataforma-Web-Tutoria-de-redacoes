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
  increment,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { FichaCorrecao, NotaCompetencia } from "@/types/ficha-correcao";

const COLECAO = "fichasCorrecao";

interface CriarFichaParams {
  redacaoId: string;
  alunoId: string;
  alunoNome: string;
  tutorId: string;
  tutorNome: string;
  turmaId?: string;
  turmaNome?: string;
  notasCompetencias: NotaCompetencia[];
  parecerGeral: string;
  observacoesAdmin?: string;
}

function calcularNotaFinal(notas: NotaCompetencia[]): number {
  return notas.reduce((soma, n) => soma + n.nota, 0);
}

export async function criarFicha(params: CriarFichaParams): Promise<string> {
  const notaFinal = calcularNotaFinal(params.notasCompetencias);

  const ficha: Omit<FichaCorrecao, "id"> = {
    redacaoId: params.redacaoId,
    alunoId: params.alunoId,
    alunoNome: params.alunoNome,
    tutorId: params.tutorId,
    tutorNome: params.tutorNome,
    data: new Date().toISOString(),
    notasCompetencias: params.notasCompetencias,
    notaFinal,
    parecerGeral: params.parecerGeral,
    status: "enviada",
    quantidadeAjustes: 0,
    criadaEm: new Date().toISOString(),
    ...(params.turmaId !== undefined && { turmaId: params.turmaId }),
    ...(params.turmaNome !== undefined && { turmaNome: params.turmaNome }),
    ...(params.observacoesAdmin !== undefined && {
      observacoesAdmin: params.observacoesAdmin,
    }),
  };

  const ref = await addDoc(collection(db, COLECAO), ficha);
  return ref.id;
}

export async function buscarFicha(id: string): Promise<FichaCorrecao | null> {
  const snap = await getDoc(doc(db, COLECAO, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FichaCorrecao;
}

interface AtualizarFichaParams {
  notasCompetencias: NotaCompetencia[];
  parecerGeral: string;
  observacoesAdmin?: string;
}

export async function atualizarFicha(
  id: string,
  params: AtualizarFichaParams
): Promise<void> {
  const notaFinal = calcularNotaFinal(params.notasCompetencias);
  await updateDoc(doc(db, COLECAO, id), {
    notasCompetencias: params.notasCompetencias,
    notaFinal,
    parecerGeral: params.parecerGeral,
    ...(params.observacoesAdmin !== undefined && {
      observacoesAdmin: params.observacoesAdmin,
    }),
  });
}

export async function atualizarEReenviarFicha(
  id: string,
  params: AtualizarFichaParams
): Promise<void> {
  const notaFinal = calcularNotaFinal(params.notasCompetencias);
  await updateDoc(doc(db, COLECAO, id), {
    notasCompetencias: params.notasCompetencias,
    notaFinal,
    parecerGeral: params.parecerGeral,
    status: "enviada",
    ...(params.observacoesAdmin !== undefined && {
      observacoesAdmin: params.observacoesAdmin,
    }),
  });
}

export async function listarFichasPendentesRevisao(): Promise<FichaCorrecao[]> {
  const q = query(
    collection(db, COLECAO),
    where("status", "==", "enviada"),
    orderBy("criadaEm", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FichaCorrecao);
}

export async function listarFichasParaAjustar(
  tutorId: string
): Promise<FichaCorrecao[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    where("status", "==", "ajustes_solicitados")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FichaCorrecao);
}

export async function aprovarFicha(id: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), { status: "aprovada" });
}

export async function solicitarAjustes(
  id: string,
  comentario: string
): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), {
    status: "ajustes_solicitados",
    comentarioAjustesAdmin: comentario,
    quantidadeAjustes: increment(1),
  });
}

export async function listarHistoricoDoTutor(
  tutorId: string
): Promise<FichaCorrecao[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    orderBy("criadaEm", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FichaCorrecao);
}

export async function listarHistoricoCompleto(): Promise<FichaCorrecao[]> {
  const q = query(collection(db, COLECAO), orderBy("criadaEm", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FichaCorrecao);
}