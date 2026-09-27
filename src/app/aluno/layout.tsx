import { RouteGuard } from "@/components/shared/RouteGuard";

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard rolesPermitidas={["aluno"]}>{children}</RouteGuard>;
}