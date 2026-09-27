import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import type { Convite } from "@/types/convite";
import type { UserRole } from "@/types/usuario";

const COLECAO = "convites";
const VALIDADE_DIAS = 7;

function gerarCodigo(): string {
  // Código curto, legível para colar em link (sem caracteres ambíguos como 0/O, 1/l).
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    alfabeto[Math.floor(Math.random() * alfabeto.length)]
  ).join("");
}

interface CriarConviteParams {
  role: UserRole;
  turmaId?: string;
  tutorId?: string;
  criadoPorAdminId: string;
}

export async function criarConvite(params: CriarConviteParams): Promise<string> {
  const codigo = gerarCodigo();
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + VALIDADE_DIAS);

  // Importante: o Firestore não aceita `undefined` como valor de campo.
  // Por isso, turmaId e tutorId só são incluídos no objeto quando existem —
  // em vez de existir com valor undefined, a chave simplesmente não aparece.
  const convite: Convite = {
    codigo,
    role: params.role,
    criadoPorAdminId: params.criadoPorAdminId,
    usado: false,
    expiraEm: expiraEm.toISOString(),
    criadoEm: new Date().toISOString(),
    ...(params.turmaId !== undefined && { turmaId: params.turmaId }),
    ...(params.tutorId !== undefined && { tutorId: params.tutorId }),
  };

  await setDoc(doc(db, COLECAO, codigo), convite);
  return codigo;
}

export async function buscarConvite(codigo: string): Promise<Convite | null> {
  const snap = await getDoc(doc(db, COLECAO, codigo));
  if (!snap.exists()) return null;
  return snap.data() as Convite;
}

export function conviteValido(convite: Convite): boolean {
  if (convite.usado) return false;
  return new Date(convite.expiraEm) > new Date();
}

export async function marcarConviteComoUsado(codigo: string): Promise<void> {
  await updateDoc(doc(db, COLECAO, codigo), { usado: true });
}

export async function listarConvitesDaTurma(turmaId: string): Promise<Convite[]> {
  const q = query(collection(db, COLECAO), where("turmaId", "==", turmaId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Convite);
}
