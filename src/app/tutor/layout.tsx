import { RouteGuard } from "@/components/shared/RouteGuard";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard rolesPermitidas={["tutor"]}>{children}</RouteGuard>;
}