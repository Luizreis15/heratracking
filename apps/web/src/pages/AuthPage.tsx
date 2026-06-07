import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (error) {
        setServerError(error.message);
        return;
      }
      setSignupDone(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    navigate(from, { replace: true });
  }

  if (signupDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-semibold text-foreground">Verifique seu e-mail</h2>
          <p className="text-muted-foreground text-sm">
            Enviamos um link de confirmação. Clique nele para ativar sua conta
            e depois faça login.
          </p>
          <button
            onClick={() => { setSignupDone(false); setMode("login"); }}
            className="text-primary text-sm underline underline-offset-2"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary tracking-tight">HERA Arquiteto</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
          <button
            className={`flex-1 py-2 transition-colors ${
              mode === "login"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            className={`flex-1 py-2 transition-colors ${
              mode === "signup"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode("signup")}
          >
            Cadastrar
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                         placeholder:text-muted-foreground"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                         placeholder:text-muted-foreground"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium
                       hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "Aguarde..."
              : mode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
