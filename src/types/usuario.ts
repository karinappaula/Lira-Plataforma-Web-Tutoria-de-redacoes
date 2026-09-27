export type UserRole = "admin" | "tutor" | "aluno";

export interface Usuario {
  uid: string;
  nome: string;
  email: string;
  role: UserRole;
  tutorId?: string; // presente somente se role === "aluno"; referencia o uid do tutor responsável
  turmaId?: string; // presente se role === "aluno" ou role === "tutor"
  conviteId?: string; // referência ao convite usado no autocadastro (auditoria)
  criadoEm: string; // ISO date string
}