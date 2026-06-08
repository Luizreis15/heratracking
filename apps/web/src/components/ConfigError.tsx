export function ConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="hera-card max-w-md p-8 text-center space-y-4">
        <p className="font-serif text-xl font-semibold text-foreground">HERA Tracking</p>
        <p className="text-sm text-destructive font-medium">Configuração incompleta</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          As variáveis <code className="text-xs">VITE_SUPABASE_URL</code> e{" "}
          <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> não foram definidas no build.
        </p>
        <div className="text-left text-xs bg-muted/50 rounded-md p-4 space-y-2 font-mono text-muted-foreground">
          <p className="font-sans font-medium text-foreground text-[11px]">
            Vercel → Project → Settings → Environment Variables:
          </p>
          <p>VITE_SUPABASE_URL</p>
          <p>VITE_SUPABASE_ANON_KEY</p>
          <p className="font-sans text-[10px] pt-1">
            Depois: Deployments → Redeploy (com &quot;Clear build cache&quot;).
          </p>
        </div>
      </div>
    </div>
  );
}
