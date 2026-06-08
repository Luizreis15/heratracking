import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Zap } from "lucide-react";
import { BRIEFING_TEMPLATES, getBriefingTemplate } from "@/lib/briefing-templates";
import { toastError } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { parseSeedsFromText } from "@/lib/concorrente-seeds";
import type { Json } from "@/types/index";

const schema = z.object({
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

const MODELOS = [
  "Gestão de tráfego pago",
  "Assessoria completa de marketing",
  "Retainer mensal + setup inicial",
  "Gestão de tráfego + assessoria estratégica",
  "Consultoria estratégica pontual",
];

const DEFAULT_RESTRICOES =
  "Evitar promessas não comprováveis e superlativos vazios. Respeitar regulamentações do nicho (LGPD, conselhos de classe, claims financeiros). Toda copy deve ser verificável e informativa.";

const BLANK_DEFAULTS: FormData = {
  nicho: "",
  posicionamento: "",
  ticket_alvo: "",
  modelo_entrega: "",
  restricoes: DEFAULT_RESTRICOES,
  concorrentes_manuais: "",
};

export function NewOperationPage() {
  const { workspace, user } = useAuth();
  const navigate = useNavigate();
  const [templateId, setTemplateId] = useState("blank");
  const [operadorPerfil, setOperadorPerfil] = useState<Record<string, unknown> | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: BLANK_DEFAULTS,
  });

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = getBriefingTemplate(id);
    if (!t) return;
    reset({
      nicho: t.nicho,
      posicionamento: t.posicionamento,
      ticket_alvo: t.ticket_alvo,
      modelo_entrega: t.modelo_entrega,
      restricoes: t.restricoes,
      concorrentes_manuais: t.concorrentes_manuais,
    });
    setOperadorPerfil(t.operador_perfil ? { ...t.operador_perfil } : null);
  }

  async function onSubmit(data: FormData) {
    if (!workspace || !user) return;

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

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="hera-btn-ghost mt-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="hera-label mb-1">Briefing</p>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Nova operação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              O worker gera o Blueprint e o mapa de concorrência em background.
            </p>
          </div>
        </div>

        <div className="hera-card p-6 lg:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Field
            label="Template de briefing"
            hint="Pré-preenche o formulário — você pode editar antes de enviar"
          >
            <select
              className={inputCls(false)}
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              {BRIEFING_TEMPLATES.map((t) => (
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
            label="Quem é seu cliente B2B (ICP)"
            hint="Quem contrata e paga sua agência — ex.: SaaS B2B, clínicas, indústrias"
            error={errors.nicho?.message}
          >
            <input
              type="text"
              placeholder="Ex.: SaaS de homologação de fornecedores para empresas de médio porte"
              className={inputCls(!!errors.nicho)}
              {...register("nicho")}
            />
          </Field>

          <Field
            label="Posicionamento da sua agência"
            hint="Como sua agência se vende para esse ICP"
            error={errors.posicionamento?.message}
          >
            <textarea
              rows={3}
              placeholder="Agência de growth B2B especializada em..."
              className={inputCls(!!errors.posicionamento)}
              {...register("posicionamento")}
            />
          </Field>

          <Field
            label="Ticket do contrato (cliente B2B → agência)"
            hint="Mensalidade/retainer que o cliente B2B paga a você — não o preço do produto que ele vende"
            error={errors.ticket_alvo?.message}
          >
            <input
              type="text"
              placeholder="R$ 5.000 – R$ 15.000/mês"
              className={inputCls(!!errors.ticket_alvo)}
              {...register("ticket_alvo")}
            />
          </Field>

          <Field
            label="Modelo de entrega"
            hint="Como você vai prestar o serviço"
            error={errors.modelo_entrega?.message}
          >
            <select
              className={inputCls(!!errors.modelo_entrega)}
              defaultValue=""
              {...register("modelo_entrega")}
            >
              <option value="" disabled>
                Selecione um modelo...
              </option>
              {MODELOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Agências concorrentes (opcional)"
            hint="Uma por linha: Nome ou Nome | https://site.com — outras agências que atendem o mesmo ICP"
            error={errors.concorrentes_manuais?.message}
          >
            <textarea
              rows={4}
              placeholder={"Agência X | https://site.com\nConsultoria Y | https://..."}
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
              {isSubmitting ? "Criando operação..." : "Iniciar Blueprint"}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Fase 1 mapeia dores do ICP e agências concorrentes do operador. Job de 20–30 min em background.
            </p>
          </div>
        </form>
        </div>
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
