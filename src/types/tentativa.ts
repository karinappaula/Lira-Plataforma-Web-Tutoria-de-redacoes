import { Timestamp } from "firebase/firestore";
import { Vestibular, Dificuldade, Alternativa, Assunto } from "./questao";

export type StatusTentativa = "em_andamento" | "finalizada";

/**
 * Filtros usados pelo aluno para gerar o simulado. Todos opcionais —
 * ausência de um campo significa "todos os valores".
 */
export interface FiltrosSimulado {
  vestibular?: Vestibular;
  ano?: number;
  assunto?: Assunto;
  dificuldade?: Dificuldade;
}

/**
 * Resposta de uma questão dentro de uma tentativa.
 * Por definição da documentação, NUNCA duplicamos enunciado/alternativas
 * aqui — apenas a referência à questão e o resultado.
 */
export interface RespostaTentativa {
  questaoId: string;
  respostaAluno: Alternativa | null;
  correta: boolean;
}

/**
 * Tentativa de simulado, documento em /tentativas/{tentativaId}.
 *
 * Decisão de design: o cronômetro é PROGRESSIVO (mede quanto tempo o aluno
 * levou), não regressivo com limite — esses simulados são treino, não prova
 * cronometrada com penalidade. `startTime` continua vindo do servidor
 * (serverTimestamp), então o ponto de partida não pode ser manipulado pelo
 * relógio do aluno; o tempo total é calculado ao finalizar.
 */
export interface Tentativa {
  id: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;

  filtros: FiltrosSimulado;
  questaoIds: string[];
  quantidade: number;

  startTime: Timestamp;

  status: StatusTentativa;
  respostas: RespostaTentativa[];

  finishedAt?: Timestamp;
  tempoGastoSegundos?: number;
  acertos?: number;
  erros?: number;
  percentual?: number;
}

export type TentativaInput = Pick<
  Tentativa,
  "alunoId" | "alunoNome" | "turmaId" | "filtros" | "questaoIds" | "quantidade"
>;