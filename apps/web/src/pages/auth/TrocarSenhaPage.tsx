import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/http";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

export function TrocarSenhaPage() {
  const { user, changePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const forced = user?.mustChangePassword;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setError("As duas senhas novas não batem.");
    if (next.length < 8) return setError("A senha nova precisa ter pelo menos 8 caracteres.");
    setError(null);
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.ok("Senha trocada!");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não deu para trocar a senha agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <h1 className="text-3xl text-brand-red">{forced ? "Primeiro, uma senha só sua" : "Trocar senha"}</h1>
            <p className="mt-1 text-sm text-brand-brown/70">
              {forced ? "A senha que você recebeu é temporária. Escolha uma nova para continuar." : "Mínimo de 8 caracteres."}
            </p>
          </div>
          {error && <Alert>{error}</Alert>}
          <Field label="Senha atual">
            <Input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nova senha" hint="Pelo menos 8 caracteres">
            <Input type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Repita a nova senha">
            <Input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>Salvar nova senha</Button>
          {forced && (
            <button type="button" onClick={() => void signOut().then(() => navigate("/login"))} className="w-full text-center text-sm text-brand-brown/60 underline">
              Sair
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}
