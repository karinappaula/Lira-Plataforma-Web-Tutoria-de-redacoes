"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRedefinicaoSenha } from "@/services/auth";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await solicitarRedefinicaoSenha(email);
      // Por segurança, sempre mostramos a mesma mensagem de sucesso,
      // mesmo que o e-mail não exista cadastrado — isso evita que
      // alguém use este formulário para descobrir quais e-mails têm
      // conta no sistema (enumeração de usuários).
      setEnviado(true);
    } catch (error) {
      // Mesmo em caso de erro, mostramos a mensagem de sucesso pelo
      // mesmo motivo acima — não revelamos se o e-mail existe ou não.
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite seu e-mail para receber um link de redefinição
          </p>
        </div>

        {enviado ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Se este e-mail estiver cadastrado, você receberá um link para
              redefinir sua senha em instantes. Verifique também a caixa de
              spam.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Voltar para o login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
              />
            </div>

            <Button type="submit" disabled={enviando} className="mt-2">
              {enviando ? "Enviando..." : "Enviar link de redefinição"}
            </Button>

            <Link
              href="/login"
              className="text-center text-sm text-muted-foreground hover:underline"
            >
              Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}