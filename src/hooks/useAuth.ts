"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { login as loginService, logout as logoutService } from "@/services/auth";

export function useAuth() {
  const { usuario, carregando } = useAuthContext();
  const router = useRouter();

  async function entrar(email: string, senha: string) {
    await loginService(email, senha);
    // Não redirecionamos aqui com base em role ainda — o AuthContext
    // precisa de um instante para buscar o perfil após o login.
    // O redirecionamento por role acontece na tela de login (Fase 6),
    // observando `usuario.role` assim que ele deixar de ser null.
  }

  async function sair() {
    await logoutService();
    router.push("/login");
  }

  return { usuario, carregando, entrar, sair };
}