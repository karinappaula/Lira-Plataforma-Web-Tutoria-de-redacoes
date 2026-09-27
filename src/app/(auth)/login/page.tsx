"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/shared/LoginForm";

export default function LoginPage() {
  const { usuario, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && usuario) {
      router.replace(`/${usuario.role}`);
    }
  }, [usuario, carregando, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Tutoria de Redações</h1>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta para continuar
          </p>
        </div>
        <LoginForm />
        <Link
          href="/esqueci-senha"
          className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
    </main>
  );
}