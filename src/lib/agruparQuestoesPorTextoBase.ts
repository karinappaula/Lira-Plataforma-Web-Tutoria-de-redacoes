import { Questao } from "@/types/questao";

const TAMANHO_PREFIXO_COMPARACAO = 150;

function prefixoNormalizado(texto: string): string {
  return texto.trim().slice(0, TAMANHO_PREFIXO_COMPARACAO).toLowerCase();
}

/**
 * Agrupa questões consecutivas (na ordem de cadastro, por número da prova)
 * que compartilham o mesmo início de enunciado — ou seja, o mesmo
 * texto-base — e embaralha a ORDEM DOS GRUPOS entre si, nunca a ordem das
 * questões dentro de um mesmo grupo.
 *
 * Isso garante que um simulado gerado nunca separe, por exemplo, as
 * questões 6 a 10 (que compartilham o mesmo texto-base) — elas sempre
 * aparecem juntas e na ordem original, mas a posição do bloco inteiro
 * dentro do simulado muda a cada geração.
 *
 * A detecção de "mesmo texto-base" é uma comparação de prefixo (primeiros
 * 150 caracteres do enunciado) — não é infalível, mas cobre bem o caso real
 * de questões cadastradas em sequência a partir do mesmo texto colado.
 */
export function agruparEEmbaralharQuestoes(questoes: Questao[]): Questao[] {
  const ordenadas = [...questoes].sort((a, b) => {
    if (a.vestibular !== b.vestibular) {
      return a.vestibular.localeCompare(b.vestibular);
    }
    if (a.ano !== b.ano) return a.ano - b.ano;
    return a.numeroQuestao - b.numeroQuestao;
  });

  const grupos: Questao[][] = [];

  for (const questao of ordenadas) {
    const grupoAtual = grupos[grupos.length - 1];
    const anterior = grupoAtual?.[grupoAtual.length - 1];

    const mesmoTextoBase =
      anterior !== undefined &&
      anterior.vestibular === questao.vestibular &&
      anterior.ano === questao.ano &&
      prefixoNormalizado(anterior.enunciado) === prefixoNormalizado(questao.enunciado);

    if (mesmoTextoBase) {
      grupoAtual.push(questao);
    } else {
      grupos.push([questao]);
    }
  }

  // Fisher-Yates só na ordem dos grupos.
  for (let i = grupos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grupos[i], grupos[j]] = [grupos[j], grupos[i]];
  }

  return grupos.flat();
}
/**
 * Verifica se duas questões compartilham o mesmo texto-base, usando a
 * mesma comparação de prefixo do agrupamento. Exportada separadamente para
 * ser reaproveitada na tela do aluno (decidir quando recolher o texto).
 */
export function mesmoTextoBase(a: Questao, b: Questao): boolean {
  return (
    a.vestibular === b.vestibular &&
    a.ano === b.ano &&
    prefixoNormalizado(a.enunciado) === prefixoNormalizado(b.enunciado)
  );
}

/**
 * Dado o índice de uma questão dentro do array já embaralhado/agrupado do
 * simulado, devolve o intervalo (índices de início e fim) do bloco de
 * texto-base ao qual ela pertence. Usado para montar o cabeçalho
 * "Texto para as Questões X a Y" na primeira questão de cada bloco.
 */
export function calcularIntervaloBloco(
  questoes: Questao[],
  indice: number
): { inicio: number; fim: number } {
  let inicio = indice;
  while (inicio > 0 && mesmoTextoBase(questoes[inicio - 1], questoes[inicio])) {
    inicio--;
  }
  let fim = indice;
  while (
    fim < questoes.length - 1 &&
    mesmoTextoBase(questoes[fim], questoes[fim + 1])
  ) {
    fim++;
  }
  return { inicio, fim };
}

/**
 * Separa o enunciado de uma questão em duas partes: a parte que é IGUAL à
 * da questão anterior (texto-base compartilhado — candidato a ficar
 * recolhido) e a parte que é ÚNICA dessa questão (o comando/pergunta em si
 * — sempre visível). Encontra o maior prefixo comum entre os dois
 * enunciados e recua até a última quebra de linha, pra não cortar no meio
 * de uma frase.
 *
 * Se `anterior` for null ou não compartilhar texto-base, devolve tudo como
 * "único" (comportamento idêntico ao de uma questão avulsa).
 */
export function separarTextoCompartilhado(
  atual: Questao,
  anterior: Questao | null
): { compartilhado: string; unico: string } {
  if (!anterior || !mesmoTextoBase(anterior, atual)) {
    return { compartilhado: "", unico: atual.enunciado };
  }

  const a = anterior.enunciado;
  const b = atual.enunciado;
  const tamanhoMaximo = Math.min(a.length, b.length);

  let i = 0;
  while (i < tamanhoMaximo && a[i] === b[i]) i++;

  let corte = b.lastIndexOf("\n", i);
  if (corte === -1) corte = 0;

  return {
    compartilhado: b.slice(0, corte).trim(),
    unico: b.slice(corte).trim(),
  };
}