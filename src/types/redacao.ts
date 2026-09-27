export type StatusRedacao =
  | "rascunho"
  | "enviada"
  | "em_correcao"
  | "corrigida"
  | "em_revisao_admin"
  | "aprovada"
  | "ajustes_solicitados";

export interface Redacao {
  id: string;
  alunoId: string;
  tutorId: string;
  tema: string;
  temaPropostoPeloAluno: boolean;
  tarefaId?: string; // presente se a redação foi criada a partir de uma tarefa
  texto: string;
  status: StatusRedacao;
  criadaEm: string;
  enviadaEm?: string;
  fichaCorrecaoId?: string;
}