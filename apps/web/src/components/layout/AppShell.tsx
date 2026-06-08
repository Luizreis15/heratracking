import { useState, useEffect } from "react";
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
  PenLine,
  Menu,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useIntelBadge } from "@/hooks/useIntelBadge";
import type { Operation } from "@/types/index";

export function AppShell() {
  const { user, workspace, isSuperAdmin, signOut } = useAuth();
  const location = useLocation();
  const { id: operationId } = useParams();
  const isOperationRoute =
    location.pathname.startsWith("/operations/") &&
    operationId &&
    operationId !== "new";
  const { count: intelBadgeCount } = useIntelBadge(
    isOperationRoute ? operationId : undefined,
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile nav tap)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <aside
        className={[
          "hera-sidebar w-60 shrink-0 flex flex-col",
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200",
          "md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="px-5 py-5 border-b border-border">
          <NavLink to="/" className="block group">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-hera-gold to-hera-gold/60 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(191,155,77,0.4)]">
                <span className="text-[11px] font-bold text-hera-navy-deep leading-none">H</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-none tracking-tight">
                  HERA
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-primary/80 mt-0.5">
                  Tracking
                </p>
              </div>
            </div>
          </NavLink>
          {workspace && (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-hera-done shrink-0" />
              <p className="text-[11px] text-muted-foreground truncate">{workspace.name}</p>
            </div>
          )}
        </div>

        <nav
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"
        >
          {!isOperationRoute ? (
            <>
              <p className="hera-label px-3 mb-2">Workspace</p>
              <NavItem to="/" icon={LayoutGrid} end>
                Operações
              </NavItem>
              <div className="hera-nav-separator" />
              <NavItem to="/operations/new" icon={Plus}>
                Nova operação
              </NavItem>
            </>
          ) : (
            <>
              <NavItem to="/" icon={LayoutGrid} end className="mb-1">
                Todas as operações
              </NavItem>
              <div className="hera-nav-separator" />
              <p className="hera-label px-3 mt-3 mb-1">Operação ativa</p>
              <p className="px-3 text-xs text-foreground/80 font-medium truncate mb-3 leading-snug">
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
              <NavItem to={`/operations/${operationId}/analise`} icon={Building2}>
                Análise
              </NavItem>
              <NavItem to={`/operations/${operationId}/operacao`} icon={BarChart3}>
                Operação
              </NavItem>
              <NavItem
                to={`/operations/${operationId}/inteligencia`}
                icon={Radar}
                badge={intelBadgeCount}
              >
                Inteligência
              </NavItem>
              <NavItem to={`/operations/${operationId}/conteudo`} icon={PenLine}>
                Conteúdo
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

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-20 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="hera-btn-ghost p-2 -ml-2"
            aria-label="Abrir menu"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-hera-gold to-hera-gold/60 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(191,155,77,0.35)]">
              <span className="text-[10px] font-bold text-hera-navy-deep leading-none">H</span>
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">HERA</span>
          </div>
          {operation?.nicho && (
            <p className="text-xs text-muted-foreground truncate">
              / {operation.nicho}
            </p>
          )}
        </div>

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
  badge = 0,
  className = "",
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  end?: boolean;
  badge?: number;
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
      <span className="flex-1 truncate">{children}</span>
      {badge > 0 && (
        <span className="ml-auto h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </NavLink>
  );
}
