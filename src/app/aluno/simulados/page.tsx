"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { listarQuestoes } from "@/services/questoes";
import { gerarSimulado } from "@/services/tentativas";
import { Assunto, Dificuldade, Vestibular } from "@/types/questao";
import { ASSUNTOS, DIFICULDADES, VESTIBULARES } from "@/lib/constantesQuestoes";
import Link from "next/link";

const TODOS = "todos";

export default function GerarSimuladoPage() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [vestibular, setVestibular] = useState<string>(TODOS);
  const [ano, setAno] = useState<string>(TODOS);
  const [assunto, setAssunto] = useState<string>(TODOS);
  const [dificuldade, setDificuldade] = useState<string>(TODOS);
  const [quantidade, setQuantidade] = useState("10");

  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([]);
  const [carregandoAnos, setCarregandoAnos] = useState(true);

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    listarQuestoes()
      .then((lista) => {
        const anos = new Set(lista.map((q) => q.ano));
        setAnosDisponiveis(Array.from(anos).sort((a, b) => b - a));
      })
      .finally(() => setCarregandoAnos(false));
  }, []);

  const quantidadeValida = useMemo(() => {
    const n = Number(quantidade);
    return Number.isFinite(n) && n > 0;
  }, [quantidade]);

  async function handleGerar() {
    if (!usuario) {
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }
    if (!usuario.turmaId) {
      setErro("Sua conta não está vinculada a uma turma. Fale com seu tutor.");
      return;
    }
    if (!quantidadeValida) {
      setErro("Informe uma quantidade válida de questões.");
      return;
    }

    setErro(null);
    setAviso(null);
    setGerando(true);

    try {
      const resultado = await gerarSimulado(
        {
          ...(vestibular !== TODOS && { vestibular: vestibular as Vestibular }),
          ...(ano !== TODOS && { ano: Number(ano) }),
          ...(assunto !== TODOS && { assunto: assunto as Assunto }),
          ...(dificuldade !== TODOS && {
            dificuldade: dificuldade as Dificuldade,
          }),
        },
        Number(quantidade),
        {
          uid: usuario.uid,
          nome: usuario.nome,
          turmaId: usuario.turmaId,
        }
      );

      if (resultado.quantidadeGerada === 0) {
        setErro(
          "Nenhuma questão encontrada com esses filtros. Tente outra combinação."
        );
        setGerando(false);
        return;
      }

      if (resultado.quantidadeGerada < resultado.quantidadeSolicitada) {
        window.alert(
          `Só encontramos ${resultado.quantidadeGerada} questão(ões) disponíveis com esses filtros (você pediu ${resultado.quantidadeSolicitada}). Em breve teremos mais questões cadastradas. Seguindo com o que está disponível.`
        );
      }

      router.push(`/aluno/simulados/${resultado.tentativaId}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar o simulado.");
      setGerando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
            <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gerar Simulado</h1>
          <p className="text-sm text-muted-foreground">
            Escolha os filtros (todos opcionais) e a quantidade de questões.
          </p>
        </div>
        <Link
          href="/aluno/simulados/historico"
          className="text-sm text-primary underline underline-offset-2"
        >
          Ver histórico
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Vestibular</Label>
          <Select value={vestibular} onValueChange={setVestibular}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {VESTIBULARES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ano</Label>
          <Select value={ano} onValueChange={setAno} disabled={carregandoAnos}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {anosDisponiveis.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Assunto</Label>
          <Select value={assunto} onValueChange={setAssunto}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {ASSUNTOS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Dificuldade</Label>
          <Select value={dificuldade} onValueChange={setDificuldade}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {DIFICULDADES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quantidade de questões</Label>
          <Input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {aviso && <p className="text-sm text-amber-500">{aviso}</p>}

        <Button
          className="w-full"
          onClick={handleGerar}
          disabled={gerando || !quantidadeValida}
        >
          {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gerar Simulado
        </Button>
      </div>
    </div>
  );
}