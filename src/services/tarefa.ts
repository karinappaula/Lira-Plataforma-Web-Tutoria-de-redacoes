import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Tarefa } from "@/types/tarefa";

const COLECAO = "tarefas";

interface CriarTarefaParams {
  tutorId: string;
  tutorNome: string;
  turmaId: string;
  turmaNome: string;
  titulo: string;
  tema: string;
  descricao?: string;
  prazo: string; // formato datetime-local, ex: "2026-07-28T14:00"
}

export async function criarTarefa(params: CriarTarefaParams): Promise<string> {
  const ref = await addDoc(collection(db, COLECAO), {
    ...params,
    criadaEm: new Date().toISOString(),
  });
  return ref.id;
}

export async function buscarTarefa(id: string): Promise<Tarefa | null> {
  const snap = await getDoc(doc(db, COLECAO, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Tarefa;
}

export async function listarTarefasDoTutor(tutorId: string): Promise<Tarefa[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    orderBy("prazo", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarefa);
}

export async function listarTarefasParaAluno(tutorId: string): Promise<Tarefa[]> {
  const q = query(
    collection(db, COLECAO),
    where("tutorId", "==", tutorId),
    orderBy("prazo", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tarefa);
}

/**
 * Edita o prazo (e opcionalmente outros campos) de uma tarefa existente.
 * Estender o prazo para uma data futura é a forma de "reabrir" uma tarefa
 * vencida — não é preciso nenhum campo extra de controle.
 */
export async function atualizarTarefa(
  id: string,
  dados: Partial<Pick<Tarefa, "titulo" | "tema" | "descricao" | "prazo">>
): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), dados);
}

export async function removerTarefa(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id));
}

/**
 * Verifica se o prazo de uma tarefa já passou, com base na data/hora atual.
 */
export function prazoExpirado(prazo: string): boolean {
  return new Date() > new Date(prazo);
}