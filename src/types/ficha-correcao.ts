export type Competencia = 1 | 2 | 3 | 4 | 5;

export interface NotaCompetencia {
  competencia: Competencia;
  nota: number;
  comentario: string;
}

export type StatusFicha = "enviada" | "aprovada" | "ajustes_solicitados" | "arquivada";

export interface FichaCorrecao {
  id: string;
  redacaoId: string;
  alunoId: string;
  alunoNome: string;
  numeroChamada?: string;
  tutorId: string;
  tutorNome: string;
  turmaId?: string;
  turmaNome?: string;
  data: string;
  notasCompetencias: NotaCompetencia[];
  notaFinal: number;
  parecerGeral: string;
  observacoesAdmin?: string;
  comentarioAjustesAdmin?: string;
  quantidadeAjustes?: number;
  status: StatusFicha;
  criadaEm: string;
}