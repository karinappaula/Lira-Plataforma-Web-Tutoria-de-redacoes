import type { UserRole } from "./usuario";

export interface Convite {
  codigo: string; // também é o ID do documento no Firestore
  role: UserRole;
  turmaId?: string; // obrigatório se role = "tutor" ou "aluno"
  tutorId?: string; // obrigatório apenas se role = "aluno"
  criadoPorAdminId: string;
  usado: boolean;
  expiraEm: string; // ISO date
  criadoEm: string;
}