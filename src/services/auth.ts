import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import type { Usuario } from "@/types/usuario";
import {
  buscarConvite,
  conviteValido,
  marcarConviteComoUsado,
} from "./convite";

/**
 * Autentica o usuário via e-mail/senha no Firebase Auth.
 * Não retorna o perfil completo aqui — só a credencial.
 * A busca do perfil (com a role) é responsabilidade de buscarPerfilUsuario().
 */
export async function login(email: string, senha: string): Promise<FirebaseUser> {
  const credencial = await signInWithEmailAndPassword(auth, email, senha);
  return credencial.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Busca o documento de perfil em /usuarios/{uid}.
 * É esse documento que contém a `role` (admin | tutor | aluno) usada
 * para RBAC no frontend. As Firestore Security Rules já garantem que
 * só o próprio usuário (ou um admin) pode ler esse documento.
 */
export async function buscarPerfilUsuario(uid: string): Promise<Usuario | null> {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return { uid: snap.id, ...snap.data() } as Usuario;
}

interface RegistrarComConviteParams {
  codigo: string;
  nome: string;
  email: string;
  senha: string;
}

/**
 * Autocadastro de Tutor ou Aluno via código de convite gerado pelo Admin
 * (ou pelo Tutor, no caso de convite de Aluno). A role, turmaId e tutorId
 * vêm do convite — a pessoa nunca escolhe a própria role, isso é validado
 * tanto aqui quanto nas Firestore Rules (defesa em profundidade).
 */
export async function registrarComConvite(
  params: RegistrarComConviteParams
): Promise<void> {
  const convite = await buscarConvite(params.codigo);

  if (!convite || !conviteValido(convite)) {
    throw new Error("Convite inválido ou expirado.");
  }

  const credencial = await createUserWithEmailAndPassword(
    auth,
    params.email,
    params.senha
  );

  // Importante: o Firestore não aceita `undefined` como valor de campo.
  // turmaId e tutorId só entram no objeto quando o convite realmente os tem
  // (ex: convite de Tutor não tem tutorId; convite de Aluno tem os dois).
  const perfil: Usuario = {
    uid: credencial.user.uid,
    nome: params.nome,
    email: params.email,
    role: convite.role,
    conviteId: params.codigo,
    criadoEm: new Date().toISOString(),
    ...(convite.turmaId !== undefined && { turmaId: convite.turmaId }),
    ...(convite.tutorId !== undefined && { tutorId: convite.tutorId }),
  };

  await setDoc(doc(db, "usuarios", credencial.user.uid), perfil);
  await marcarConviteComoUsado(params.codigo);

  // Se o convite for de Tutor vinculado a uma turma, atualiza a turma
  // para incluir esse tutor em tutorIds (relação bidirecional).
  // Import dinâmico evita import circular entre auth.ts e turma.ts.
  if (convite.role === "tutor" && convite.turmaId) {
    const { adicionarTutorNaTurma } = await import("./turma");
    await adicionarTutorNaTurma(convite.turmaId, credencial.user.uid);
  }
}

/**
 * Envia e-mail de redefinição de senha via Firebase Authentication.
 * O Firebase cuida de gerar o link seguro e validar o token — não
 * precisamos de nenhuma lógica de servidor própria para isso.
 */
export async function solicitarRedefinicaoSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}