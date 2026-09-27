export interface Tarefa {
  id: string;
  tutorId: string;
  tutorNome: string;
  turmaId: string;
  turmaNome: string;
  titulo: string;
  tema: string;
  descricao?: string;
  prazo: string; // ISO date (só a data, ex: "2026-08-15")
  criadaEm: string;
}