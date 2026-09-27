import { Timestamp } from "firebase/firestore";
import { Vestibular, Assunto } from "./questao";

/**
 * Documento em /cadernoErros/{alunoId_questaoId}.
 *
 * Decisão de design (a documentação pede o comportamento, não o formato de
 * armazenamento): em vez de guardar erros espalhados dentro de cada
 * Tentativa — o que exigiria varrer todas as tentativas do aluno toda vez
 * que ele quiser revisar o caderno de erros — mantemos um documento
 * agregado por questão errada, com contador incremental. Isso torna a tela
 * "Revisar questões erradas" uma query simples por alunoId, sem agregação
 * em runtime.
 *
 * O documento é criado/atualizado (increment) toda vez que finishQuiz()
 * processa uma resposta errada; nunca é criado se a resposta foi correta.
 * Se o aluno acertar a questão numa tentativa futura, o registro permanece
 * (histórico de que ele já errou aquilo), mas isso pode ser refinado na
 * Fase 5 se vocês preferirem removê-lo ao acertar.
 *
 * `vestibular` e `assunto` usam os mesmos tipos fechados de `questao.ts`
 * (não mais string livre) — consistente com a simplificação do escopo para
 * Língua Portuguesa. `area`/`disciplina` foram removidos, mesmo motivo de
 * `tentativa.ts`.
 */
export interface CadernoErro {
  id: string; // `${alunoId}_${questaoId}`
  alunoId: string;
  questaoId: string;

  // snapshot da questão, para filtrar o caderno sem buscar cada Questao
  vestibular: Vestibular;
  assunto: Assunto;

  quantidadeErros: number;
  ultimoErroEm: Timestamp;
}