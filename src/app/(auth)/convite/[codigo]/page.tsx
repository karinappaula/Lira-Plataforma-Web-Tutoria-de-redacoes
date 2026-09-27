"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buscarConvite, conviteValido } from "@/services/convite";
import { registrarComConvite } from "@/services/auth";
import type { Convite } from "@/types/convite";

export default function ConvitePage() {
  const params = useParams<{ codigo: string }>();
  const router = useRouter();

  const [convite, setConvite] = useState<Convite | null | undefined>(undefined);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const dados = await buscarConvite(params.codigo);
      setConvite(dados);
    }
    carregar();
  }, [params.codigo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await registrarComConvite({
        codigo: params.codigo,
        nome,
        email,
        senha,
      });
      toast.success("Conta criada com sucesso!");
      router.replace("/login");
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro: ${mensagem}`);
      console.error("Erro completo ao criar conta:", error);
      setEnviando(false);
    }
  }

  // Estado de carregamento inicial
  if (convite === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Verificando convite...</p>
      </main>
    );
  }

  // Convite inexistente, expirado ou já usado
  if (!convite || !conviteValido(convite)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg border p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Convite inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de convite não existe, já foi usado ou expirou. Peça um
            novo link ao administrador.
          </p>
        </div>
      </main>
    );
  }

  const rotuloRole = convite.role === "tutor" ? "Tutor" : "Aluno";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Criar conta de {rotuloRole}</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado para a plataforma Tutoria de Redações
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={enviando} className="mt-2">
            {enviando ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </div>
    </main>
  );
}