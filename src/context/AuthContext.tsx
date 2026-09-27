"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { buscarPerfilUsuario } from "@/services/auth";
import type { Usuario } from "@/types/usuario";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  carregando: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUsuario(null);
        setCarregando(false);
        return;
      }

      const perfil = await buscarPerfilUsuario(firebaseUser.uid);
      setUsuario(perfil);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}