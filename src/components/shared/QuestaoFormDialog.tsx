"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Wand2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  criarQuestao,
  editarQuestao,
  parseQuestaoColada,
  verificarQuestaoDuplicada,
} from "@/services/questoes";
import {
  Alternativa,
  Assunto,
  Dificuldade,
  Questao,
  QuestaoInput,
  Vestibular,
} from "@/types/questao";
import {
  ALTERNATIVAS,
  ASSUNTOS,
  DIFICULDADES,
  VESTIBULARES,
} from "@/lib/constantesQuestoes";
import { ImagemPasteUpload } from "@/components/shared/ImagemPasteUpload";
import { TextoFormatado } from "@/components/shared/TextoFormatado";
import { EnunciadoComImagem } from "@/components/shared/EnunciadoComImagem";

// useAuth() devolve `{ usuario }`, onde `usuario` já é o documento de
// /usuarios/{uid} (inclui uid, nome, role etc.) — não o objeto de
// autenticação do Firebase.

interface QuestaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questaoEditando: Questao | null;
  onSaved: () => void;
}

const alternativasVazias = (): Record<Alternativa, string> => ({
  A: "",
  B: "",
  C: "",
  D: "",
  E: "",
});

// Chave usada para salvar o rascunho automático no navegador (só em modo
// criação — questão em edição já está salva no Firestore, não precisa
// de rascunho local).
const RASCUNHO_STORAGE_KEY = "tutoria:rascunho-questao";

export function QuestaoFormDialog({
  open,
  onOpenChange,
  questaoEditando,
  onSaved,
}: QuestaoFormDialogProps) {
  const { usuario } = useAuth();

  const [vestibular, setVestibular] = useState<Vestibular>("ENEM");
  const [ano, setAno] = useState("");
  const [numeroQuestao, setNumeroQuestao] = useState("");
  const [assunto, setAssunto] = useState<Assunto | "">("");
  const [dificuldade, setDificuldade] = useState<Dificuldade>("Média");

  const [textoColado, setTextoColado] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState<Record<Alternativa, string>>(
    alternativasVazias()
  );
  const [respostaCorreta, setRespostaCorreta] = useState<Alternativa | "">("");
  const [explicacao, setExplicacao] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  // Letras cujo texto veio do parser e ainda não foi revisado manualmente
  // pela Admin — usado só para dar destaque visual, não afeta o salvamento.
  const [camposParaRevisar, setCamposParaRevisar] = useState<Set<Alternativa>>(
    new Set()
  );

  const [avisoDuplicidade, setAvisoDuplicidade] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const editando = !!questaoEditando;

  function formPossuiConteudo() {
    return (
      enunciado.trim() !== "" ||
      explicacao.trim() !== "" ||
      textoColado.trim() !== "" ||
      imagemUrl !== null ||
      Object.values(alternativas).some((v) => v.trim() !== "")
    );
  }

  function restaurarRascunho(dados: Record<string, unknown>) {
    setVestibular((dados.vestibular as Vestibular) ?? "ENEM");
    setAno((dados.ano as string) ?? "");
    setNumeroQuestao((dados.numeroQuestao as string) ?? "");
    setAssunto((dados.assunto as Assunto) ?? "");
    setDificuldade((dados.dificuldade as Dificuldade) ?? "Média");
    setEnunciado((dados.enunciado as string) ?? "");
    setAlternativas(
      (dados.alternativas as Record<Alternativa, string>) ?? alternativasVazias()
    );
    setRespostaCorreta((dados.respostaCorreta as Alternativa) ?? "");
    setExplicacao((dados.explicacao as string) ?? "");
    setImagemUrl((dados.imagemUrl as string | null) ?? null);
    setTextoColado("");
    setCamposParaRevisar(new Set());
  }

  // Preenche o formulário ao abrir em modo edição, limpa em modo criação —
  // ou, se houver um rascunho salvo, pergunta se a Admin quer continuar.
  useEffect(() => {
    if (!open) return;

    if (questaoEditando) {
      setVestibular(questaoEditando.vestibular);
      setAno(String(questaoEditando.ano));
      setNumeroQuestao(String(questaoEditando.numeroQuestao));
      setAssunto(questaoEditando.assunto);
      setDificuldade(questaoEditando.dificuldade);
      setEnunciado(questaoEditando.enunciado);
      setAlternativas(questaoEditando.alternativas);
      setRespostaCorreta(questaoEditando.respostaCorreta);
      setExplicacao(questaoEditando.explicacao ?? "");
      setImagemUrl(questaoEditando.imagemUrl);
      setTextoColado("");
      setCamposParaRevisar(new Set());
    } else {
      const rascunhoSalvo = localStorage.getItem(RASCUNHO_STORAGE_KEY);
      if (rascunhoSalvo) {
        const continuar = window.confirm(
          "Encontramos um rascunho não salvo de uma questão anterior. Deseja continuar de onde parou?"
        );
        if (continuar) {
          try {
            restaurarRascunho(JSON.parse(rascunhoSalvo));
          } catch {
            limparFormulario();
          }
        } else {
          localStorage.removeItem(RASCUNHO_STORAGE_KEY);
          limparFormulario();
        }
      } else {
        limparFormulario();
      }
    }
    setErro(null);
    setAvisoDuplicidade(null);
  }, [open, questaoEditando]);

  // Salva o rascunho automaticamente enquanto a Admin digita (só em modo
  // criação, com debounce de ~800ms pra não escrever no localStorage a
  // cada tecla).
  useEffect(() => {
    if (!open || editando || !formPossuiConteudo()) return;

    const timeout = setTimeout(() => {
      const rascunho = {
        vestibular,
        ano,
        numeroQuestao,
        assunto,
        dificuldade,
        enunciado,
        alternativas,
        respostaCorreta,
        explicacao,
        imagemUrl,
      };
      localStorage.setItem(RASCUNHO_STORAGE_KEY, JSON.stringify(rascunho));
    }, 800);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    editando,
    vestibular,
    ano,
    numeroQuestao,
    assunto,
    dificuldade,
    enunciado,
    alternativas,
    respostaCorreta,
    explicacao,
    imagemUrl,
  ]);

  // Intercepta o fechamento do modal (clique fora, Esc, botão X) para
  // avisar antes de sair se houver conteúdo — mesmo com rascunho salvo,
  // vale confirmar pra Admin não perder o fio do que estava fazendo.
  function handleOpenChange(novoEstado: boolean) {
    if (!novoEstado && !editando && formPossuiConteudo()) {
      const confirmar = window.confirm(
        "Você tem uma questão não salva. Ela fica guardada como rascunho e você pode continuar depois. Fechar mesmo assim?"
      );
      if (!confirmar) return;
    }
    onOpenChange(novoEstado);
  }

  function limparFormulario(manterVestibularEAno = false) {
    if (!manterVestibularEAno) {
      setVestibular("ENEM");
      setAno("");
    }
    setNumeroQuestao("");
    setAssunto("");
    setDificuldade("Média");
    setTextoColado("");
    setEnunciado("");
    setAlternativas(alternativasVazias());
    setRespostaCorreta("");
    setExplicacao("");
    setImagemUrl(null);
    setCamposParaRevisar(new Set());
  }

  function handleDetectarAutomaticamente() {
    if (!textoColado.trim()) return;

    const resultado = parseQuestaoColada(textoColado);
    setEnunciado(resultado.enunciado);
    setAlternativas((prev) => ({ ...prev, ...resultado.alternativas }));
    setCamposParaRevisar(new Set(resultado.alternativasEncontradas));
  }

  function handleAlternativaChange(letra: Alternativa, valor: string) {
    setAlternativas((prev) => ({ ...prev, [letra]: valor }));
    // Uma vez que a Admin edita manualmente, consideramos revisado.
    setCamposParaRevisar((prev) => {
      const novo = new Set(prev);
      novo.delete(letra);
      return novo;
    });
  }

  async function handleCheckDuplicidade() {
    if (editando || !vestibular || !ano || !numeroQuestao) return;
    try {
      const duplicada = await verificarQuestaoDuplicada(
        vestibular,
        Number(ano),
        Number(numeroQuestao)
      );
      setAvisoDuplicidade(
        duplicada
          ? `Já existe uma questão ${vestibular} ${ano} nº ${numeroQuestao} cadastrada.`
          : null
      );
    } catch {
      // checagem é só um aviso — falha silenciosa não deve travar o cadastro
    }
  }

  function validar(): string | null {
    if (!ano.trim()) return "Informe o ano da prova.";
    if (!numeroQuestao.trim()) return "Informe o número da questão.";
    if (!assunto) return "Selecione o assunto.";
    if (!enunciado.trim()) return "O enunciado não pode ficar vazio.";
    for (const letra of ALTERNATIVAS) {
      if (!alternativas[letra].trim()) {
        return `A alternativa ${letra} não pode ficar vazia.`;
      }
    }
    if (!respostaCorreta) return "Selecione qual é a alternativa correta.";
    return null;
  }

  async function handleSalvar(salvarENova: boolean) {
    const mensagemErro = validar();
    if (mensagemErro) {
      setErro(mensagemErro);
      return;
    }
    if (!usuario) {
      setErro("Sessão expirada. Faça login novamente.");
      return;
    }

    setErro(null);
    setSalvando(true);

    const input: QuestaoInput = {
      vestibular,
      ano: Number(ano),
      numeroQuestao: Number(numeroQuestao),
      assunto: assunto as Assunto,
      dificuldade,
      enunciado: enunciado.trim(),
      imagemUrl,
      alternativas,
      respostaCorreta: respostaCorreta as Alternativa,
      // tags ainda não tem UI própria — fica pronto para a Fase 3
      tags: [],
      ...(explicacao.trim() && { explicacao: explicacao.trim() }),
    };

    try {
      if (questaoEditando) {
        await editarQuestao(questaoEditando.id, input);
      } else {
        await criarQuestao(input, usuario.uid);
      }

      onSaved();
      localStorage.removeItem(RASCUNHO_STORAGE_KEY);

      if (salvarENova) {
        // Mantém vestibular/ano (mesma prova) e sugere o próximo número,
        // agilizando o cadastro de uma prova inteira em sequência.
        const proximoNumero = Number(numeroQuestao) + 1;
        limparFormulario(true);
        setNumeroQuestao(String(proximoNumero));
      } else {
        onOpenChange(false);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar a questão.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar Questão" : "Nova Questão de Português"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identificação da prova */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Vestibular</Label>
              <Select
                value={vestibular}
                onValueChange={(v) => setVestibular(v as Vestibular)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Input
                type="number"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                onBlur={handleCheckDuplicidade}
                placeholder="2025"
              />
            </div>
            <div>
              <Label>Nº da questão</Label>
              <Input
                type="number"
                value={numeroQuestao}
                onChange={(e) => setNumeroQuestao(e.target.value)}
                onBlur={handleCheckDuplicidade}
                placeholder="91"
              />
            </div>
          </div>
          {avisoDuplicidade && (
            <p className="text-sm text-amber-500">{avisoDuplicidade}</p>
          )}

          {/* Colar e detectar */}
          {!editando && (
            <div className="rounded-md border border-dashed border-border p-3">
              <Label>Colar texto da prova (opcional)</Label>
              <Textarea
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                placeholder="Cole aqui o texto copiado do PDF da prova, incluindo as 5 alternativas..."
                rows={5}
                className="mt-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={handleDetectarAutomaticamente}
                disabled={!textoColado.trim()}
              >
                <Wand2 className="mr-1 h-4 w-4" />
                Detectar automaticamente
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Separa o enunciado e as alternativas automaticamente. Sempre
                revise o resultado antes de salvar.
              </p>
            </div>
          )}

          {/* Enunciado */}
          <div>
            <Label>Enunciado (inclua o texto-base, se houver)</Label>
                        <p className="mb-1 text-xs text-muted-foreground">
              Use **negrito** e *itálico* para formatar — mesmo padrão do
              WhatsApp. Se tiver imagem, digite{" "}
              <code className="rounded bg-muted px-1">[IMAGEM]</code> no
              ponto exato do texto onde ela deve aparecer.
            </p>
            <Textarea
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              rows={8}
              placeholder="Cole ou digite o texto-base e o comando da questão..."
            />
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Pré-visualização (como o aluno vai ver):
              </p>
                            <EnunciadoComImagem
                enunciado={enunciado}
                imagemUrl={imagemUrl}
                className="text-sm"
              />
            </div>
          </div>

          {/* Imagem */}
          <div>
            <Label>Imagem (opcional)</Label>
            <ImagemPasteUpload value={imagemUrl} onChange={setImagemUrl} />
          </div>

          {/* Alternativas */}
          <div className="space-y-2">
            <Label>Alternativas</Label>
            {ALTERNATIVAS.map((letra) => {
              const paraRevisar = camposParaRevisar.has(letra);
              return (
                <div key={letra} className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 font-medium">
                    {letra}
                  </span>
                  <div className="flex-1">
                    <Textarea
                      value={alternativas[letra]}
                      onChange={(e) =>
                        handleAlternativaChange(letra, e.target.value)
                      }
                      rows={2}
                      className={
                        paraRevisar
                          ? "border-amber-500 ring-1 ring-amber-500/40"
                          : ""
                      }
                    />
                    {paraRevisar && (
                      <span className="text-xs text-amber-500">
                        Detectado automaticamente — revise antes de salvar
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resposta correta */}
          <div>
            <Label>Alternativa correta</Label>
            <RadioGroup
              value={respostaCorreta}
              onValueChange={(v) => setRespostaCorreta(v as Alternativa)}
              className="flex gap-4"
            >
              {ALTERNATIVAS.map((letra) => (
                <div key={letra} className="flex items-center gap-1">
                  <RadioGroupItem value={letra} id={`resp-${letra}`} />
                  <Label htmlFor={`resp-${letra}`}>{letra}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Assunto e dificuldade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assunto</Label>
              <Select
                value={assunto}
                onValueChange={(v) => setAssunto(v as Assunto)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
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
              <Select
                value={dificuldade}
                onValueChange={(v) => setDificuldade(v as Dificuldade)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFICULDADES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Explicação opcional */}
          <div>
            <Label>Explicação (opcional, mostrada ao aluno após responder)</Label>
            <Textarea
              value={explicacao}
              onChange={(e) => setExplicacao(e.target.value)}
              rows={3}
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter className="gap-2">
          {!editando && (
            <Button
              variant="outline"
              onClick={() => handleSalvar(true)}
              disabled={salvando}
            >
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e Nova
            </Button>
          )}
          <Button onClick={() => handleSalvar(false)} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
