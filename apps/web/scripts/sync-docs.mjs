// Copia a página para leigos (docs/como-funciona.html) para public/docs, servida pelo próprio Hub.
import { cpSync, mkdirSync } from "node:fs";
mkdirSync("public/docs", { recursive: true });
cpSync("../../docs/como-funciona.html", "public/docs/como-funciona.html");
console.log("docs sincronizados → public/docs/como-funciona.html");
