import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Turma } from "@/types/turma";

const COLECAO = "turmas";

export async function criarTurma(
  dados: Omit<Turma, "id" | "criadaEm">
): Promise<string> {
  const ref = await addDoc(collection(db, COLECAO), {
    ...dados,
    criadaEm: new Date().toISOString(),
  });
  return ref.id;
}

export async function listarTurmas(): Promise<Turma[]> {
  const q = query(collection(db, COLECAO), orderBy("nome"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Turma);
}

export async function buscarTurma(id: string): Promise<Turma | null> {
  const snap = await getDoc(doc(db, COLECAO, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Turma;
}

export async function atualizarTurma(
  id: string,
  dados: Partial<Omit<Turma, "id" | "criadaEm">>
): Promise<void> {
  await updateDoc(doc(db, COLECAO, id), dados);
}

export async function removerTurma(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECAO, id));
}

export async function adicionarTutorNaTurma(
  turmaId: string,
  tutorId: string
): Promise<void> {
  await updateDoc(doc(db, COLECAO, turmaId), {
    tutorIds: arrayUnion(tutorId),
  });
}