import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  increment,
  documentId,
} from "firebase/firestore";

import { db } from "@/firebase/config";


import {
  FiltrosSimulado,
  RespostaTentativa,
  Tentativa,
} from "@/types/tentativa";

import { agruparEEmbaralharQuestoes } from "@/lib/agruparQuestoesPorTextoBase";
import { Questao, Assunto } from "@/types/questao";

const COLLECTION_TENTATIVAS = "tentativas";
const COLLECTION_QUESTOES = "questoes";
const COLLECTION_CADERNO_ERROS = "cadernoErros";

interface DadosAluno {
  uid: string;
  nome: string;
  turmaId: string;
}

interface ResultadoGeracao {
  tentativaId: string;
  quantidadeGerada: number;
  quantidadeSolicitada: number;
}

/**
 * Busca questões que batem com os filtros, agrupa/embaralha respeitando
 * blocos de texto-base, cria a Tentativa no Firestore e retorna o id.
 *
 * Se existirem menos questões disponíveis do que a quantidade pedida, gera
 * o simulado com todas as que existem — quem chama decide como avisar o
 * aluno disso (ver `quantidadeGerada` vs `quantidadeSolicitada` no retorno).
 */
export async function gerarSimulado(
  filtros: FiltrosSimulado,
  quantidadeSolicitada: number,
  aluno: DadosAluno
): Promise<ResultadoGeracao> {
  const condicoes = [];

  if (filtros.vestibular)
    condicoes.push(where("vestibular", "==", filtros.vestibular));

  if (filtros.ano)
    condicoes.push(where("ano", "==", filtros.ano));

  if (filtros.assunto)
    condicoes.push(where("assunto", "==", filtros.assunto));

  if (filtros.dificuldade)
    condicoes.push(where("dificuldade", "==", filtros.dificuldade));

  const q = query(collection(db, COLLECTION_QUESTOES), ...condicoes);

  const snap = await getDocs(q);

  const questoesDisponiveis = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Questao
  );

  const agrupadas = agruparEEmbaralharQuestoes(questoesDisponiveis);

  const selecionadas = agrupadas.slice(0, quantidadeSolicitada);

  const ref = await addDoc(collection(db, COLLECTION_TENTATIVAS), {
    alunoId: aluno.uid,
    alunoNome: aluno.nome,
    turmaId: aluno.turmaId,
    filtros,
    questaoIds: selecionadas.map((q) => q.id),
    quantidade: selecionadas.length,
    status: "em_andamento",
    respostas: [],
    startTime: serverTimestamp(),
  });

  return {
    tentativaId: ref.id,
    quantidadeGerada: selecionadas.length,
    quantidadeSolicitada,
  };
}

export async function buscarTentativaPorId(
  id: string
): Promise<Tentativa | null> {
  const snap = await getDoc(doc(db, COLLECTION_TENTATIVAS, id));

  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as Tentativa;
}

/**
 * Busca várias questões por ID de uma vez (usa `documentId() in [...]`,
 * limite de 30 por consulta do Firestore — suficiente para o tamanho de
 * simulado deste projeto). Preserva a ordem pedida em `ids`, já que o
 * Firestore não garante ordem de retorno em queries `in`.
 */
export async function buscarQuestoesPorIds(
  ids: string[]
): Promise<Questao[]> {
  if (ids.length === 0) return [];

  const q = query(
    collection(db, COLLECTION_QUESTOES),
    where(documentId(), "in", ids.slice(0, 30))
  );

  const snap = await getDocs(q);

  const mapa = new Map(
    snap.docs.map((d) => [
      d.id,
      { id: d.id, ...d.data() } as Questao,
    ])
  );

  return ids
    .map((id) => mapa.get(id))
    .filter((q): q is Questao => q !== undefined);
}

/**
 * Salva o progresso das respostas sem finalizar — permite que o aluno
 * feche o navegador e retome de onde parou (o startTime, vindo do
 * servidor, garante que o tempo mostrado depois continua correto).
 */
export async function salvarProgresso(
  tentativaId: string,
  respostas: RespostaTentativa[]
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION_TENTATIVAS, tentativaId),
    { respostas }
  );
}

/**
 * Finaliza a tentativa: calcula acertos/erros/percentual, grava o tempo
 * gasto e registra as questões erradas no Caderno de Erros do aluno.
 *
 * O tempo gasto é medido no momento do clique em "Finalizar" (Date.now()
 * do cliente) contra o `startTime` do servidor — como não há mais limite
 * de tempo nem penalidade associada (é treino, não prova cronometrada),
 * essa medição é só informativa, não precisa da mesma blindagem
 * anti-fraude que um cronômetro regressivo exigiria.
 */
export async function finalizarTentativa(
  tentativaId: string,
  respostas: RespostaTentativa[],
  questoesDaTentativa: Questao[],
  alunoId: string,
  startTimeMillis: number
): Promise<{
  acertos: number;
  erros: number;
  percentual: number;
  tempoGastoSegundos: number;
}> {
  const quantidade = respostas.length;

  const acertos = respostas.filter((r) => r.correta).length;

  const erros = quantidade - acertos;

  const percentual =
    quantidade > 0 ? Math.round((acertos / quantidade) * 100) : 0;

  const tempoGastoSegundos = Math.max(
    0,
    Math.round((Date.now() - startTimeMillis) / 1000)
  );

  const ref = doc(db, COLLECTION_TENTATIVAS, tentativaId);

  await updateDoc(ref, {
    respostas,
    status: "finalizada",
    finishedAt: serverTimestamp(),
    acertos,
    erros,
    percentual,
    tempoGastoSegundos,
  });

  const questoesErradasIds = new Set(
    respostas
      .filter((r) => !r.correta)
      .map((r) => r.questaoId)
  );

  const questoesErradas = questoesDaTentativa.filter((q) =>
    questoesErradasIds.has(q.id)
  );

  const questoesAcertadasIds = respostas
    .filter((r) => r.correta)
    .map((r) => r.questaoId);

  try {
    await Promise.all([
      ...questoesErradas.map((questao) =>
        registrarErroNoCaderno(alunoId, questao)
      ),

      // Acertar uma questão remove ela do Caderno de Erros — o caderno
      // reflete o que o aluno ainda precisa praticar, não tudo que já
      // errou algum dia. deleteDoc não falha se o registro não existir.
      ...questoesAcertadasIds.map((questaoId) =>
        deleteDoc(
          doc(
            db,
            COLLECTION_CADERNO_ERROS,
            `${alunoId}_${questaoId}`
          )
        )
      ),
    ]);
  } catch (erroCadernoDeErros) {
    console.error(
      "Falha ao atualizar o Caderno de Erros:",
      erroCadernoDeErros
    );
  }

  return {
    acertos,
    erros,
    percentual,
    tempoGastoSegundos,
  };
}

/**
 * Cria ou incrementa o registro de erro daquele aluno naquela questão.
 * ID composto e determinístico (alunoId_questaoId) — mesmo padrão de
 * Favorito, evita duplicar e permite upsert direto sem query.
 */
async function registrarErroNoCaderno(
  alunoId: string,
  questao: Questao
): Promise<void> {
  const id = `${alunoId}_${questao.id}`;

  const ref = doc(db, COLLECTION_CADERNO_ERROS, id);

  await setDoc(
    ref,
    {
      alunoId,
      questaoId: questao.id,
      vestibular: questao.vestibular,
      assunto: questao.assunto,
      quantidadeErros: increment(1),
      ultimoErroEm: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Lista as tentativas finalizadas de um aluno, mais recentes primeiro.
 * Usado na tela de histórico — reaproveita a tela /aluno/simulados/[id]
 * pra exibir o detalhe de cada uma (ela já sabe renderizar o resultado
 * quando o status é "finalizada").
 */
export async function listarTentativasFinalizadas(
  alunoId: string
): Promise<Tentativa[]> {
  const q = query(
    collection(db, COLLECTION_TENTATIVAS),
    where("alunoId", "==", alunoId),
    where("status", "==", "finalizada"),
    orderBy("finishedAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Tentativa
  );
}

/**
 * Lista o Caderno de Erros do aluno — uma entrada por questão já errada
 * pelo menos uma vez, com o contador de quantas vezes errou.
 */
export async function listarCadernoErros(
  alunoId: string
): Promise<{ questaoId: string; quantidadeErros: number }[]> {
  const q = query(
    collection(db, COLLECTION_CADERNO_ERROS),
    where("alunoId", "==", alunoId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    questaoId: d.data().questaoId as string,
    quantidadeErros: d.data().quantidadeErros as number,
  }));
}

/**
 * Gera uma tentativa a partir de uma lista fixa de questões (não de
 * filtros) — usado pelo botão "Refazer questões erradas" do Caderno
 * de Erros. Reaproveita o mesmo agrupamento/embaralhamento por
 * texto-base.
 */
export async function gerarSimuladoAPartirDeIds(
  questaoIds: string[],
  aluno: DadosAluno
): Promise<string> {
  const questoes = await buscarQuestoesPorIds(questaoIds);

  const agrupadas = agruparEEmbaralharQuestoes(questoes);

  const ref = await addDoc(collection(db, COLLECTION_TENTATIVAS), {
    alunoId: aluno.uid,
    alunoNome: aluno.nome,
    turmaId: aluno.turmaId,
    filtros: {},
    questaoIds: agrupadas.map((q) => q.id),
    quantidade: agrupadas.length,
    status: "em_andamento",
    respostas: [],
    startTime: serverTimestamp(),
  });

  return ref.id;
}
export interface DesempenhoPorAssunto {
  assunto: Assunto;
  acertos: number;
  total: number;
  percentual: number;
}

/**
 * Calcula o aproveitamento do aluno por assunto, considerando todas as
 * respostas de todas as tentativas finalizadas. Ordenado do pior
 * desempenho para o melhor — pensado pra já apontar onde o aluno mais
 * precisa estudar.
 */
export async function calcularDesempenhoPorAssunto(
  alunoId: string
): Promise<DesempenhoPorAssunto[]> {
  const tentativasFinalizadas = await listarTentativasFinalizadas(alunoId);
  if (tentativasFinalizadas.length === 0) return [];

  const todosQuestaoIds = new Set<string>();
  tentativasFinalizadas.forEach((t) =>
    t.respostas.forEach((r) => todosQuestaoIds.add(r.questaoId))
  );

  const questoes = await buscarQuestoesPorIds(Array.from(todosQuestaoIds));
  const mapaAssuntoPorQuestao = new Map(questoes.map((q) => [q.id, q.assunto]));

  const agregados = new Map<Assunto, { acertos: number; total: number }>();

  tentativasFinalizadas.forEach((t) => {
    t.respostas.forEach((r) => {
      const assunto = mapaAssuntoPorQuestao.get(r.questaoId);
      if (!assunto) return;
      const atual = agregados.get(assunto) ?? { acertos: 0, total: 0 };
      atual.total += 1;
      if (r.correta) atual.acertos += 1;
      agregados.set(assunto, atual);
    });
  });

  return Array.from(agregados.entries())
    .map(([assunto, { acertos, total }]) => ({
      assunto,
      acertos,
      total,
      percentual: total > 0 ? Math.round((acertos / total) * 100) : 0,
    }))
    .sort((a, b) => a.percentual - b.percentual);
}
/**
 * Busca as tentativas finalizadas de vários alunos de uma vez — usado no
 * Painel do Tutor para agregar o desempenho de todos os tutorados.
 * Limite de 30 alunos por consulta (limite do operador `in` do Firestore),
 * suficiente para o volume real do projeto (~8-9 alunos por tutor).
 */
export async function listarTentativasFinalizadasVariosAlunos(
  alunoIds: string[]
): Promise<Tentativa[]> {
  if (alunoIds.length === 0) return [];

  const q = query(
    collection(db, COLLECTION_TENTATIVAS),
    where("alunoId", "in", alunoIds.slice(0, 30)),
    where("status", "==", "finalizada")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tentativa);
}

export interface DesempenhoAluno {
  alunoId: string;
  totalSimulados: number;
  mediaGeral: number;
}

/**
 * Calcula, para um grupo de alunos, quantos simulados cada um já fez e a
 * média de aproveitamento individual — usado na tabela do Painel do Tutor.
 */
export function calcularDesempenhoPorAluno(
  tentativas: Tentativa[]
): DesempenhoAluno[] {
  const agregados = new Map<string, { soma: number; total: number }>();

  tentativas.forEach((t) => {
    const atual = agregados.get(t.alunoId) ?? { soma: 0, total: 0 };
    atual.soma += t.percentual ?? 0;
    atual.total += 1;
    agregados.set(t.alunoId, atual);
  });

  return Array.from(agregados.entries()).map(([alunoId, { soma, total }]) => ({
    alunoId,
    totalSimulados: total,
    mediaGeral: total > 0 ? Math.round(soma / total) : 0,
  }));
}

/**
 * Calcula o aproveitamento por assunto considerando um grupo de tentativas
 * já buscadas (de vários alunos) — a versão "por turma" da mesma lógica
 * usada em calcularDesempenhoPorAssunto (individual). Recebe as tentativas
 * prontas em vez de buscar de novo, evitando duplicar a consulta.
 */
export async function calcularDesempenhoPorAssuntoGrupo(
  tentativas: Tentativa[]
): Promise<DesempenhoPorAssunto[]> {
  if (tentativas.length === 0) return [];

  const todosQuestaoIds = new Set<string>();
  tentativas.forEach((t) =>
    t.respostas.forEach((r) => todosQuestaoIds.add(r.questaoId))
  );

  const questoes = await buscarQuestoesPorIds(Array.from(todosQuestaoIds));
  const mapaAssuntoPorQuestao = new Map(questoes.map((q) => [q.id, q.assunto]));

  const agregados = new Map<Assunto, { acertos: number; total: number }>();

  tentativas.forEach((t) => {
    t.respostas.forEach((r) => {
      const assunto = mapaAssuntoPorQuestao.get(r.questaoId);
      if (!assunto) return;
      const atual = agregados.get(assunto) ?? { acertos: 0, total: 0 };
      atual.total += 1;
      if (r.correta) atual.acertos += 1;
      agregados.set(assunto, atual);
    });
  });

  return Array.from(agregados.entries())
    .map(([assunto, { acertos, total }]) => ({
      assunto,
      acertos,
      total,
      percentual: total > 0 ? Math.round((acertos / total) * 100) : 0,
    }))
    .sort((a, b) => a.percentual - b.percentual);
}