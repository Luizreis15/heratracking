import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
  "Compliance CFO/CFM: não prometer resultado garantido, cura, percentual de sucesso ou comparações com outros profissionais. Evitar superlativos não comprováveis (\"melhor\", \"único\"). Toda copy deve ser informativa, não apelativa.";

export function NewOperationPage() {
  const { workspace, user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { restricoes: DEFAULT_RESTRICOES },
  });

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
        status: "queued",
      })
      .select()
      .single();

    if (error) {
      alert(`Erro ao criar operação: ${error.message}`);
      return;
    }

    navigate(`/operations/${op.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground">Nova Operação</h1>
          <p className="text-xs text-muted-foreground">
            Briefing para o Arquiteto de Agência
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nicho */}
          <Field
            label="Nicho do cliente final"
            hint="Ex: clínicas de implante dentário, estética avançada, escolas bilíngues"
            error={errors.nicho?.message}
          >
            <input
              type="text"
              placeholder="Clínicas de implante dentário e reabilitação oral"
              className={inputCls(!!errors.nicho)}
              {...register("nicho")}
            />
          </Field>

          {/* Posicionamento */}
          <Field
            label="Posicionamento / expertise do operador"
            hint="O que você domina e como quer ajudar esse nicho"
            error={errors.posicionamento?.message}
          >
            <textarea
              rows={3}
              placeholder="Agência especializada em atrair pacientes de alto valor para clínicas odontológicas via tráfego pago e marketing digital..."
              className={inputCls(!!errors.posicionamento)}
              {...register("posicionamento")}
            />
          </Field>

          {/* Ticket-alvo */}
          <Field
            label="Ticket-alvo de contrato"
            hint="Valor mensal que você quer cobrar dos seus clientes"
            error={errors.ticket_alvo?.message}
          >
            <input
              type="text"
              placeholder="R$ 2.500 – 3.500/mês"
              className={inputCls(!!errors.ticket_alvo)}
              {...register("ticket_alvo")}
            />
          </Field>

          {/* Modelo de entrega */}
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

          {/* Restrições / Compliance */}
          <Field
            label="Restrições e compliance do nicho"
            hint="Promessas proibidas, regras de conselho de classe, limitações de copy"
            error={errors.restricoes?.message}
          >
            <textarea
              rows={4}
              className={inputCls(!!errors.restricoes)}
              {...register("restricoes")}
            />
          </Field>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !workspace}
              className="w-full flex items-center justify-center gap-2 py-3 px-6
                         bg-primary text-primary-foreground rounded-lg text-sm font-medium
                         hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              <Zap className="h-4 w-4" />
              {isSubmitting ? "Criando operação..." : "Iniciar Blueprint"}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              O job de 20–30 min roda em background — você pode fechar a aba e voltar.
            </p>
          </div>
        </form>
      </main>
    </div>
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
