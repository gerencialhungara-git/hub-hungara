import { Link } from "react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthLayout } from "./LoginPage";

export function EsqueciSenhaPage() {
  return (
    <AuthLayout>
      <div className="space-y-4 text-center">
        <MessageCircle className="mx-auto size-12 text-brand-red" />
        <h1 className="text-3xl text-brand-red">Sem caô: é só pedir</h1>
        <p className="text-sm text-brand-brown/80">
          Por enquanto o Hub não manda e-mail. Fala com o administrador do Hub (<strong>gerencial.hungara@gmail.com</strong>) que ele redefine sua senha
          e te passa uma nova. Na primeira entrada você troca por uma só sua.
        </p>
        <Link to="/login">
          <Button variant="secondary" className="w-full">Voltar para o login</Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
