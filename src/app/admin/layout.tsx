import { RouteGuard } from "@/components/shared/RouteGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard rolesPermitidas={["admin"]}>{children}</RouteGuard>;
}