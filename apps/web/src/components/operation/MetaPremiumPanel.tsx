import { useEffect, useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toastError } from "@/lib/toast";
import { supabase } from "@/lib/supabase";

export function MetaPremiumPanel() {
  const { workspace, setWorkspace } = useAuth();
  const [clientId, setClientId] = useState(workspace?.hera_premium_client_id ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setClientId(workspace?.hera_premium_client_id ?? "");
  }, [workspace?.hera_premium_client_id]);

  async function handleSave() {
    if (!workspace) return;
    setSaving(true);
    const value = clientId.trim() || null;
    const { data, error } = await supabase
      .from("workspaces")
      .update({ hera_premium_client_id: value })
      .eq("id", workspace.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      toastError(`Erro: ${error.message}`);
      return;
    }
    if (data) setWorkspace(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const linked = Boolean(workspace?.hera_premium_client_id?.trim());

  return (
    <div className="hera-card p-4 space-y-3 border-primary/15">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Link2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Conexão Meta (painel Hera)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reutiliza tokens do <strong>Hera_Agendamento</strong> e app de Tráfego já conectados em{" "}
            <a
              href="https://painel.digitalhera.com.br"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              painel.digitalhera.com.br
            </a>
            . O worker lê <code className="text-[10px]">meta_connections</code> via Supabase premium.
          </p>
        </div>
        <span
          className={[
            "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
            linked
              ? "border-hera-done/40 text-hera-done bg-hera-done/10"
              : "border-border text-muted-foreground",
          ].join(" ")}
        >
          {linked ? "Vinculado" : "Pendente"}
        </span>
      </div>

      <div className="space-y-1">
        <label className="hera-label">Client ID (premium-zero)</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="uuid do cliente Hera DG em clients"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          No painel: abra o cliente Hera DG → URL contém o UUID. Cole aqui + configure{" "}
          <code className="text-[10px]">HERA_PREMIUM_*</code> no worker.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="hera-btn-primary text-xs"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : saved ? (
          <Check className="h-3.5 w-3.5" />
        ) : null}
        {saved ? "Salvo" : "Salvar vínculo"}
      </button>
    </div>
  );
}
