"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/usuario";

interface RouteGuardProps {
  children: ReactNode;
  rolesPermitidas: UserRole[];
}

/**
 * Bloqueia a renderização da página até confirmar que o usuário logado
 * tem uma das roles permitidas. Redireciona para /login (não autenticado)
 * ou para a home da própria role (autenticado mas sem permissão).
 *
 * Isso NÃO substitui as Firestore Security Rules — é só uma camada de UX
 * para evitar telas piscando ou usuários vendo estrutura de páginas que
 * não deveriam acessar. A segurança real dos dados está no banco.
 */
export function RouteGuard({ children, rolesPermitidas }: RouteGuardProps) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    if (!rolesPermitidas.includes(usuario.role)) {
      router.replace(`/${usuario.role}`);
    }
  }, [usuario, carregando, rolesPermitidas, router]);

  if (carregando || !usuario || !rolesPermitidas.includes(usuario.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}