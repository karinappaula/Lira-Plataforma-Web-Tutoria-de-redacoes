import { Timestamp } from "firebase/firestore";

/**
 * Vestibulares suportados nesta versão do sistema.
 * Restrito por documentação técnica: ENEM, FUVEST, UNICAMP.
 */
export type Vestibular = "ENEM" | "FUVEST" | "UNICAMP";

/**
 * Nível de dificuldade da questão, definido manualmente no cadastro.
 */
export type Dificuldade = "Fácil" | "Média" | "Difícil";

/**
 * Chave de alternativa. Fixo em 5 opções (padrão dos 3 vestibulares suportados).
 */
export type Alternativa = "A" | "B" | "C" | "D" | "E";

/**
 * Assuntos de Língua Portuguesa. Union type fechado (em vez de string livre)
 * porque o escopo do sistema foi reduzido a uma única disciplina — não faz
 * sentido a Admin digitar/errar o nome do assunto quando a lista é conhecida
 * e pequena. Se um dia o escopo crescer para outras disciplinas, isso volta
 * a ser um campo mais aberto (ou uma coleção `assuntos` no Firestore).
 */
export type Assunto =
  | "Interpretação de Texto"
  | "Gramática"
  | "Literatura"
  | "Funções da Linguagem"
  | "Gêneros Textuais"
  | "Figuras de Linguagem"
  | "Variação Linguística"
  | "Semântica e Coesão"
  | "Redação Oficial";

/**
 * Estrutura de uma questão de múltipla escolha de Língua Portuguesa,
 * documento em /questoes/{questaoId}.
 *
 * Decisões de tipagem:
 * - Não existem mais os campos `area` e `disciplina`: como o sistema é
 *   inteiramente dedicado a Língua Portuguesa, guardar esse valor em toda
 *   questão seria redundante (sempre o mesmo valor).
 * - `ano` é `number` (não union type) para permitir cadastrar anos futuros
 *   sem alterar o código do sistema.
 * - Não existe entidade separada de "texto de apoio": o texto-base (quando
 *   existe) fica dentro do próprio campo `enunciado`, formatado pela Admin
 *   ao colar/revisar o conteúdo. Questões que compartilham o mesmo texto-base
 *   são cadastradas como registros independentes, cada uma repetindo o
 *   texto-base no início do enunciado — decisão consciente para manter o
 *   cadastro simples, já que o volume de questões é pequeno (1 disciplina).
 */
export interface Questao {
  id: string;
  vestibular: Vestibular;
  ano: number;
  numeroQuestao: number;

  assunto: Assunto;
  dificuldade: Dificuldade;

  enunciado: string;
  imagemUrl: string | null; // URL no Firebase Storage, null se não houver imagem

  alternativas: Record<Alternativa, string>;
  respostaCorreta: Alternativa;
  explicacao?: string;

  tags: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
  criadoPor: string; // uid do admin que cadastrou (auditoria)
}

/**
 * Payload usado ao criar ou editar uma questão manualmente — sem os campos
 * gerados pelo sistema (id, createdAt, updatedAt, criadoPor).
 */
export type QuestaoInput = Omit<
  Questao,
  "id" | "createdAt" | "updatedAt" | "criadoPor"
>;

/**
 * Resultado do parser de "colar texto da prova" — usado apenas no formulário
 * de cadastro, nunca persistido. Ver services/questoes.ts -> parseQuestaoColada().
 */
export interface QuestaoParseada {
  enunciado: string;
  alternativas: Partial<Record<Alternativa, string>>;
  alternativasEncontradas: Alternativa[]; // quais letras o parser conseguiu identificar
}