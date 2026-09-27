export interface Turma {
  id: string;
  nome: string; // ex: "3ºA"
  anoLetivo: number; // ex: 2026 — evita misturar turmas de anos diferentes com o mesmo nome
  vestibularFoco: "ENEM" | "FUVEST" | "UNICAMP" | "OUTRO";
  adminId: string;
  tutorIds: string[];
  criadaEm: string;
}