import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/http";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function LoginPage() {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "authed") return <Navigate to={params.get("next") ?? "/"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signIn(email, password);
      navigate(user.mustChangePassword ? "/trocar-senha" : (params.get("next") ?? "/"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não deu para conectar na API. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h1 className="text-3xl text-brand-red">Entrar no Hub</h1>
          <p className="mt-1 text-sm text-brand-brown/70">Use o e-mail e a senha que o admin te passou.</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <Field label="E-mail">
          <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@hungaralanches.com.br" />
        </Field>
        <Field label="Senha">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Entrar
        </Button>
        <p className="text-center text-sm">
          <Link to="/esqueci-senha" className="text-brand-red underline">Esqueci minha senha</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-red p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-brand-cream">
          <div className="flex size-32 items-center justify-center rounded-full bg-brand-cream shadow-lg">
            <img src="/brand/logo-hungara.png" alt="Hungara Lanches" className="h-24 w-24 object-contain" />
          </div>
          <span className="font-display text-3xl tracking-wide">Hub Hungara</span>
        </div>
        <Card className="bg-brand-cream">{children}</Card>
      </div>
    </div>
  );
}
