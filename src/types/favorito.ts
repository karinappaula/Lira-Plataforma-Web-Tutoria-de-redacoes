import { Timestamp } from "firebase/firestore";

/**
 * Documento em /favoritos/{alunoId_questaoId}.
 *
 * ID composto e determinístico: evita duplicar favorito na mesma questão
 * (o setDoc fica idempotente) e permite checar/remover com getDoc direto
 * pelo ID, em vez de query — seguindo a lição já aprendida no projeto de
 * preferir busca por ID a query() sempre que possível.
 */
export interface Favorito {
  id: string; // `${alunoId}_${questaoId}`
  alunoId: string;
  questaoId: string;
  createdAt: Timestamp;
}
