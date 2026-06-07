import { useAuth } from "@/contexts/AuthContext";
import { useBootstrap } from "@/hooks/useBootstrap";
import { LogOut, Building2, Loader2 } from "lucide-react";

export function DashboardPage() {
  const { user, workspace, signOut } = useAuth();
  const { bootstrapping, error } = useBootstrap();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">HERA Arquiteto</span>
          {workspace && (
            <>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {workspace.name}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {bootstrapping && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Inicializando workspace...</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {workspace && !bootstrapping && (
          <>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">
                Bem-vindo ao {workspace.name}
              </h2>
              <p className="text-muted-foreground">
                Gere o Blueprint Operacional Mestre e a Análise de Concorrência para o seu nicho.
              </p>
            </div>

            {/* CTA — habilitado em F3 */}
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
              <div className="text-4xl">🏗️</div>
              <h3 className="text-lg font-medium text-foreground">Nenhuma operação ainda</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Crie sua primeira operação para gerar o Blueprint Operacional Mestre e mapear a concorrência.
              </p>
              <button
                disabled
                title="Disponível na F3"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground
                           rounded-md text-sm font-medium opacity-40 cursor-not-allowed"
              >
                Nova Operação
              </button>
              <p className="text-xs text-muted-foreground">(disponível após F3)</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
