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
} from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  Questao,
  QuestaoInput,
  QuestaoParseada,
  Alternativa,
  Vestibular,
} from "@/types/questao";

const COLLECTION = "questoes";

// ============================================================
// CRUD
// ============================================================

/**
 * Cria uma nova questão. `criadoPor` vem do uid do admin logado (AuthContext).
 */
export async function criarQuestao(
  input: QuestaoInput,
  criadoPor: string
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...input,
    // spread condicional para explicacao — Firestore não aceita `undefined`
    // (lição já aprendida no projeto)
    ...(input.explicacao !== undefined && { explicacao: input.explicacao }),
    criadoPor,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Edita uma questão existente. Aceita atualização parcial.
 */
export async function editarQuestao(
  id: string,
  input: Partial<QuestaoInput>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function excluirQuestao(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Busca uma questão por ID direto (get), preferido a query sempre que
 * possível — mesmo padrão já adotado no projeto.
 */
export async function buscarQuestaoPorId(id: string): Promise<Questao | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Questao;
}

/**
 * Lista todas as questões cadastradas, mais recentes primeiro.
 * Usado na tela /admin/banco-questoes (Fase 2/3). Filtros mais refinados
 * (vestibular, ano, assunto) entram na Fase 3.
 */
export async function listarQuestoes(): Promise<Questao[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Questao);
}

/**
 * Verifica duplicidade antes de salvar: mesma prova (vestibular + ano) e
 * mesmo número de questão já cadastrado. Usado no formulário para avisar
 * a Admin antes de salvar (não bloqueia — pode haver reaplicação de prova).
 */
export async function verificarQuestaoDuplicada(
  vestibular: Vestibular,
  ano: number,
  numeroQuestao: number
): Promise<boolean> {
  const q = query(
    collection(db, COLLECTION),
    where("vestibular", "==", vestibular),
    where("ano", "==", ano),
    where("numeroQuestao", "==", numeroQuestao)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ============================================================
// PARSER — "Colar texto da prova" / "Detectar automaticamente"
// ============================================================

const ORDEM_ALTERNATIVAS: Alternativa[] = ["A", "B", "C", "D", "E"];

// Distância máxima (em linhas) tolerada entre uma alternativa e a próxima.
// Alternativas reais ficam sempre coladas umas nas outras (no máximo
// quebrando em 2-3 linhas por causa do tamanho do texto). Um "A" que apareça
// isolado, longe de um B próximo, é quase sempre falso positivo (frase do
// texto-base que começa com "A", artigo definido — muito comum em
// português: "A autora...", "A escrita...", "A crônica...").
const DISTANCIA_MAXIMA_LINHAS = 10;

/**
 * Tenta separar automaticamente um bloco de texto colado direto do PDF da
 * prova em `enunciado` + 5 `alternativas`. Não usa IA — é reconhecimento de
 * padrão (regex) sobre o formato previsível das provas (ENEM/FUVEST/UNICAMP).
 *
 * Duas limpezas acontecem antes de tudo:
 * 1. Remove linhas que são só número — é a numeração de linha da margem do
 *    PDF (usada nos vestibulares para permitir citar "linha 12" no gabarito),
 *    que gruda como linha solta ao copiar o texto e não é conteúdo real.
 * 2. Busca o bloco de alternativas de trás pra frente, exigindo que as 5
 *    letras apareçam próximas umas das outras (ver DISTANCIA_MAXIMA_LINHAS).
 *    Isso evita que uma frase do texto-base que comece com "A " seja
 *    confundida com a alternativa A — como esse "A" falso fica longe do B
 *    de verdade, a distância máxima descarta esse candidato.
 *
 * O resultado é sempre revisável/editável pela Admin no formulário — o
 * parser só poupa digitação, nunca decide sozinho.
 */
export function parseQuestaoColada(textoColado: string): QuestaoParseada {
  const linhas = textoColado
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\d+$/.test(l)); // remove numeração de margem

  const regexAlternativa = /^([A-E])[).\-–]?\s+(.*)$/;

  // Mapeia, para cada letra, em quais linhas ela aparece como possível início
  // de alternativa.
  const candidatosPorLetra: Record<Alternativa, number[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };

  linhas.forEach((linha, idx) => {
    const match = linha.match(regexAlternativa);
    if (match) {
      candidatosPorLetra[match[1] as Alternativa].push(idx);
    }
  });

  // Busca de trás pra frente: para cada candidato a E, tenta encaixar um D
  // próximo antes dele, depois um C próximo do D, e assim por diante até A.
  let cadeiaEscolhida: Partial<Record<Alternativa, number>> | null = null;

  for (const idxE of [...candidatosPorLetra.E].reverse()) {
    const tentativa: Partial<Record<Alternativa, number>> = { E: idxE };
    let idxAnterior = idxE;
    let cadeiaValida = true;

    for (let i = ORDEM_ALTERNATIVAS.length - 2; i >= 0; i--) {
      const letra = ORDEM_ALTERNATIVAS[i];
      const candidatosProximos = candidatosPorLetra[letra].filter(
        (idx) => idx < idxAnterior && idxAnterior - idx <= DISTANCIA_MAXIMA_LINHAS
      );

      if (candidatosProximos.length === 0) {
        cadeiaValida = false;
        break;
      }

      // Entre os candidatos próximos, pega o mais perto do próximo passo.
      const idxEscolhido = candidatosProximos[candidatosProximos.length - 1];
      tentativa[letra] = idxEscolhido;
      idxAnterior = idxEscolhido;
    }

    if (cadeiaValida) {
      cadeiaEscolhida = tentativa;
      break;
    }
  }

  // Nenhum bloco confiável de alternativas foi encontrado — devolve tudo
  // como enunciado, sem alternativas, para a Admin separar manualmente.
  if (!cadeiaEscolhida) {
    return {
      enunciado: linhas.join("\n"),
      alternativas: {},
      alternativasEncontradas: [],
    };
  }

  const alternativas: Partial<Record<Alternativa, string>> = {};

  for (let i = 0; i < ORDEM_ALTERNATIVAS.length; i++) {
    const letra = ORDEM_ALTERNATIVAS[i];
    const inicio = cadeiaEscolhida[letra]!;
    const fim =
      i < ORDEM_ALTERNATIVAS.length - 1
        ? cadeiaEscolhida[ORDEM_ALTERNATIVAS[i + 1]]!
        : linhas.length;

    const partes: string[] = [];
    for (let l = inicio; l < fim; l++) {
      const linha = linhas[l];
      const match = linha.match(regexAlternativa);
      partes.push(l === inicio && match ? match[2] : linha);
    }
    alternativas[letra] = partes.join(" ").trim();
  }

  const enunciado = linhas.slice(0, cadeiaEscolhida.A!).join("\n");
  const alternativasEncontradas = (
    Object.keys(alternativas) as Alternativa[]
  ).sort();

  return { enunciado, alternativas, alternativasEncontradas };
}