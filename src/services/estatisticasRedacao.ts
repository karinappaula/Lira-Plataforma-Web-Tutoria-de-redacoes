import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Competencia, FichaCorrecao } from "@/types/ficha-correcao";

export interface EvolucaoCompetencias {
  data: string;
  notaFinal: number;
  notasPorCompetencia: Partial<Record<Competencia, number>>;
}

/**
 * Busca as fichas de correção aprovadas de um aluno e monta a evolução
 * histórica das notas, competência por competência, em ordem cronológica.
 *
 * Filtra por `alunoId` + `status == "aprovada"` diretamente na query (não
 * só no client) — mesmo padrão já usado no projeto, necessário para bater
 * exatamente com a condição das Security Rules de `fichasCorrecao`.
 */
export async function buscarEvolucaoRedacoes(
  alunoId: string
): Promise<EvolucaoCompetencias[]> {
  const q = query(
    collection(db, "fichasCorrecao"),
    where("alunoId", "==", alunoId),
    where("status", "==", "aprovada")
  );
  const snap = await getDocs(q);
  const fichas = snap.docs.map((d) => d.data() as FichaCorrecao);

  const evolucao: EvolucaoCompetencias[] = fichas.map((f) => {
    const notasPorCompetencia: Partial<Record<Competencia, number>> = {};
    f.notasCompetencias.forEach((nc) => {
      notasPorCompetencia[nc.competencia] = nc.nota;
    });
    return { data: f.data, notaFinal: f.notaFinal, notasPorCompetencia };
  });

  // Ordena cronologicamente. Se `data` não for uma data válida pro
  // JavaScript interpretar (ex: formato DD/MM/AAAA em vez de ISO), cai no
  // fallback de comparação de texto — pode não ficar 100% correto nesse
  // caso, vale confirmar o formato real usado no cadastro da ficha.
  evolucao.sort((a, b) => {
    const dataA = new Date(a.data).getTime();
    const dataB = new Date(b.data).getTime();
    if (!Number.isNaN(dataA) && !Number.isNaN(dataB)) return dataA - dataB;
    return a.data.localeCompare(b.data);
  });

  return evolucao;
}