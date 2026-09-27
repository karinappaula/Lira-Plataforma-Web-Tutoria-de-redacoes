import { Alternativa, Assunto, Dificuldade, Vestibular } from "@/types/questao";

/**
 * Listas fixas usadas nos selects do formulário de questão e, mais pra
 * frente (Fase 3), nos filtros de busca. Centralizadas aqui para não
 * duplicar o array literal em cada componente.
 */

export const VESTIBULARES: Vestibular[] = ["ENEM", "FUVEST", "UNICAMP"];

export const DIFICULDADES: Dificuldade[] = ["Fácil", "Média", "Difícil"];

export const ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D", "E"];

export const ASSUNTOS: Assunto[] = [
  "Interpretação de Texto",
  "Gramática",
  "Literatura",
  "Funções da Linguagem",
  "Gêneros Textuais",
  "Figuras de Linguagem",
  "Variação Linguística",
  "Semântica e Coesão",
  "Redação Oficial",
];
