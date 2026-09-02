// Gera docs/como-funciona.html a partir do template, embutindo as fontes da marca em base64
// para a página funcionar sozinha (arquivo local, dentro do Hub ou publicada como Artifact).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fonts = join(here, "../../apps/web/public/fonts");
const b64 = (f) => readFileSync(join(fonts, f)).toString("base64");

let html = readFileSync(join(here, "como-funciona.template.html"), "utf8");
html = html.replace("__FONT_AYR__", b64("AyrBlufy-Black.ttf")).replace("__FONT_OMNES__", b64("OmnesSemiCond-SemiBold.ttf"));
writeFileSync(join(here, "../como-funciona.html"), html);
console.log("docs/como-funciona.html gerado", (html.length / 1024).toFixed(0), "KB");
