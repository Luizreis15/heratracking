import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Building2, Layers, Zap } from "lucide-react";
import { BRIEFING_TEMPLATES, getBriefingTemplate } from "@/lib/briefing-templates";
import { briefingFormCopy } from "@/lib/briefing-form-config";
import {
  OPERADOR_TIPO_OPTIONS,
  type OperadorTipo,
} from "@/lib/operador-tipo";
import { toastError } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { parseSeedsFromText } from "@/lib/concorrente-seeds";
import type { Json } from "@/types/index";

const schema = z.object({
  operador_nome: z.string().min(2, "Informe o nome").max(120),
  nicho: z
    .string()
    .min(5, "Descreva o nicho com pelo menos 5 caracteres")
    .max(200),
  posicionamento: z
    .string()
    .min(20, "Descreva o posicionamento com pelo menos 20 caracteres")
    .max(1000),
  ticket_alvo: z.string().min(2, "Informe o ticket-alvo").max(100),
  modelo_entrega: z.string().min(3, "Selecione ou descreva o modelo").max(200),
  restricoes: z.string().max(2000).default(""),
  concorrentes_manuais: z.string().max(5000).default(""),
});

type FormData = z.infer<typeof schema>;

const DEFAULT_RESTRICOES =
  "Evitar promessas não comprováveis e superlativos vazios. Respeitar regulamentações do nicho (LGPD, conselhos de classe, claims financeiros). Toda copy deve ser verificável e informativa.";

const BLANK_DEFAULTS: FormData = {
  operador_nome: "",
  nicho: "",
  posicionamento: "",
  ticket_alvo: "",
  modelo_entrega: "",
  restricoes: DEFAULT_RESTRICOES,
  concorrentes_manuais: "",
};

type WizardStep = "tipo" | "briefing";

export function NewOperationPage() {
  const { workspace, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("tipo");
  const [templateId, setTemplateId] = useState("blank");
  const [operadorTipo, setOperadorTipo] = useState<OperadorTipo | null>(null);

  const copy = operadorTipo ? briefingFormCopy(operadorTipo) : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: BLANK_DEFAULTS,
  });

  const availableTemplates = BRIEFING_TEMPLATES.filter(
    (t) => t.id === "blank" || t.operador_tipo === operadorTipo,
  );

  function selectTipo(tipo: OperadorTipo) {
    setOperadorTipo(tipo);
    setTemplateId("blank");
    reset({
      ...BLANK_DEFAULTS,
      restricoes: DEFAULT_RESTRICOES,
      modelo_entrega: briefingFormCopy(tipo).modelos[0] ?? "",
    });
    setStep("briefing");
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = getBriefingTemplate(id);
    if (!t || !operadorTipo) return;
    if (t.operador_tipo !== operadorTipo && t.id !== "blank") return;

    reset({
      operador_nome: t.operador_perfil?.nome ?? "",
      nicho: t.nicho,
      posicionamento: t.posicionamento,
      ticket_alvo: t.ticket_alvo,
      modelo_entrega: t.modelo_entrega,
      restricoes: t.restricoes,
      concorrentes_manuais: t.concorrentes_manuais,
    });
  }

  async function onSubmit(data: FormData) {
    if (!workspace || !user || !operadorTipo) return;

    const template = getBriefingTemplate(templateId);
    const perfilFromTemplate = template?.operador_perfil;

    const operadorPerfil: Record<string, unknown> = {
      tipo: operadorTipo,
      nome: data.operador_nome.trim(),
      ...(perfilFromTemplate
        ? {
            oferta: perfilFromTemplate.oferta,
            ticket: perfilFromTemplate.ticket ?? data.ticket_alvo,
            posicionamento: perfilFromTemplate.posicionamento ?? data.posicionamento,
            pontos_fortes: perfilFromTemplate.pontos_fortes,
            pontos_fracos: perfilFromTemplate.pontos_fracos,
            notas: perfilFromTemplate.notas,
          }
        : {
            oferta: data.posicionamento,
            ticket: data.ticket_alvo,
            posicionamento: data.posicionamento,
          }),
    };

    const { data: op, error } = await supabase
      .from("operations")
      .insert({
        workspace_id: workspace.id,
        created_by: user.id,
        nicho: data.nicho,
        posicionamento: data.posicionamento,
        ticket_alvo: data.ticket_alvo,
        modelo_entrega: data.modelo_entrega,
        restricoes: data.restricoes,
        concorrentes_seeds: parseSeedsFromText(data.concorrentes_manuais),
        operador_perfil: operadorPerfil as Json,
        operador_tipo: operadorTipo,
        job_mode: "full",
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      toastError(`Erro ao criar operação: ${error.message}`);
      return;
    }

    navigate(`/operations/${op.id}`);
  }

  const selectedTemplate = getBriefingTemplate(templateId);
  const tipoOption = OPERADOR_TIPO_OPTIONS.find((o) => o.value === operadorTipo);

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => (step === "briefing" ? setStep("tipo") : navigate("/"))}
            className="hera-btn-ghost mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="hera-label mb-1">Briefing</p>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Nova operação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "tipo"
                ? "Primeiro passo: o que você está estruturando?"
                : copy?.pageSubtitle}
            </p>
          </div>
        </div>

        {step === "tipo" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O caminho muda conforme o tipo. Agência mapeia concorrentes de marketing; SaaS mapeia
              players do mercado e GTM para atrair empresas.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {OPERADOR_TIPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectTipo(opt.value)}
                  className="hera-card p-6 text-left hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {opt.value === "saas_b2b" ? (
                      <Layers className="h-6 w-6 text-primary" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          operadorTipo &&
          copy && (
            <div className="hera-card p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {tipoOption?.label}
                </span>
                <button
                  type="button"
                  onClick={() => setStep("tipo")}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Trocar tipo
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Field
                  label="Template de briefing"
                  hint="Só templates compatíveis com o tipo selecionado"
                >
                  <select
                    className={inputCls(false)}
                    value={templateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    {availableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && selectedTemplate.id !== "blank" && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {selectedTemplate.description}
                    </p>
                  )}
                </Field>

                <Field
                  label={copy.operadorNome.label}
                  hint={copy.operadorNome.hint}
                  error={errors.operador_nome?.message}
                >
                  <input
                    type="text"
                    placeholder={copy.operadorNome.placeholder}
                    className={inputCls(!!errors.operador_nome)}
                    {...register("operador_nome")}
                  />
                </Field>

                <Field
                  label={copy.nicho.label}
                  hint={copy.nicho.hint}
                  error={errors.nicho?.message}
                >
                  <input
                    type="text"
                    placeholder={copy.nicho.placeholder}
                    className={inputCls(!!errors.nicho)}
                    {...register("nicho")}
                  />
                </Field>

                <Field
                  label={copy.posicionamento.label}
                  hint={copy.posicionamento.hint}
                  error={errors.posicionamento?.message}
                >
                  <textarea
                    rows={3}
                    placeholder={copy.posicionamento.placeholder}
                    className={inputCls(!!errors.posicionamento)}
                    {...register("posicionamento")}
                  />
                </Field>

                <Field
                  label={copy.ticket.label}
                  hint={copy.ticket.hint}
                  error={errors.ticket_alvo?.message}
                >
                  <input
                    type="text"
                    placeholder={copy.ticket.placeholder}
                    className={inputCls(!!errors.ticket_alvo)}
                    {...register("ticket_alvo")}
                  />
                </Field>

                <Field
                  label={copy.modelo.label}
                  hint={copy.modelo.hint}
                  error={errors.modelo_entrega?.message}
                >
                  <select
                    className={inputCls(!!errors.modelo_entrega)}
                    {...register("modelo_entrega")}
                  >
                    <option value="" disabled>
                      Selecione um modelo...
                    </option>
                    {copy.modelos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={copy.concorrentes.label}
                  hint={copy.concorrentes.hint}
                  error={errors.concorrentes_manuais?.message}
                >
                  <textarea
                    rows={4}
                    placeholder={copy.concorrentes.placeholder}
                    className={inputCls(!!errors.concorrentes_manuais)}
                    {...register("concorrentes_manuais")}
                  />
                </Field>

                <Field
                  label="Restrições e compliance do nicho"
                  hint="Promessas proibidas, LGPD, regulamentações do setor, limitações de copy"
                  error={errors.restricoes?.message}
                >
                  <textarea
                    rows={4}
                    className={inputCls(!!errors.restricoes)}
                    {...register("restricoes")}
                  />
                </Field>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !workspace}
                    className="w-full hera-btn-primary justify-center py-3"
                  >
                    <Zap className="h-4 w-4" />
                    {isSubmitting ? "Criando operação..." : copy.submitLabel}
                  </button>
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    {copy.submitHint}
                  </p>
                </div>
              </form>
            </div>
          )
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full px-3 py-2 rounded-md border bg-background text-sm",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
    "placeholder:text-muted-foreground",
    hasError ? "border-destructive" : "border-input",
  ].join(" ");
}
