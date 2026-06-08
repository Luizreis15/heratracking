import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import {
  LayoutGrid,
  Plus,
  LogOut,
  Kanban,
  FileText,
  Users,
  Building2,
  Radar,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Operation } from "@/types/index";

export function AppShell() {
  const { user, workspace, isSuperAdmin, signOut } = useAuth();
  const location = useLocation();
  const { id: operationId } = useParams();
  const isOperationRoute = location.pathname.startsWith("/operations/") && operationId && operationId !== "new";

  const { data: operation } = useQuery<Operation | null>({
    queryKey: ["operation", operationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations")
        .select("*")
        .eq("id", operationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!isOperationRoute,
  });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hera-sidebar w-60 shrink-0 flex flex-col">
        <div className="px-5 py-6 border-b border-border">
          <NavLink to="/" className="block group">
            <p className="font-serif text-2xl font-semibold text-foreground leading-none tracking-tight">
              Hera
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mt-1">
              Tracking
            </p>
          </NavLink>
          {workspace && (
            <p className="text-[11px] text-muted-foreground mt-3 truncate">{workspace.name}</p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isOperationRoute ? (
            <>
              <p className="hera-label px-3 mb-2">Workspace</p>
              <NavItem to="/" icon={LayoutGrid} end>
                Operações
              </NavItem>
              <NavItem to="/operations/new" icon={Plus}>
                Nova operação
              </NavItem>
            </>
          ) : (
            <>
              <NavItem to="/" icon={LayoutGrid} end className="mb-3">
                ← Todas as operações
              </NavItem>
              <p className="hera-label px-3 mb-2">Esta operação</p>
              <p className="px-3 text-xs text-foreground font-medium truncate mb-3">
                {operation?.nicho ?? "Carregando..."}
              </p>
              <NavItem to={`/operations/${operationId}`} icon={Kanban} end>
                Jornada
              </NavItem>
              <NavItem to={`/operations/${operationId}/blueprint`} icon={FileText}>
                Blueprint
              </NavItem>
              <NavItem to={`/operations/${operationId}/concorrencia`} icon={Users}>
                Concorrência
              </NavItem>
              <NavItem to={`/operations/${operationId}/hera-dg`} icon={Building2}>
                Análise
              </NavItem>
              <NavItem to={`/operations/${operationId}/operacao`} icon={BarChart3}>
                Operação
              </NavItem>
              <NavItem to={`/operations/${operationId}/inteligencia`} icon={Radar}>
                Inteligência
              </NavItem>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-2">
          {isSuperAdmin && (
            <span className="block text-[10px] font-medium px-3 text-primary/80 uppercase tracking-wide">
              Super admin
            </span>
          )}
          <p className="text-xs text-muted-foreground px-3 truncate">{user?.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="hera-btn-ghost w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  children,
  end,
  className = "",
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  end?: boolean;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "hera-nav-item",
          isActive ? "hera-nav-item-active" : "hera-nav-item-idle",
          className,
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </NavLink>
  );
}
