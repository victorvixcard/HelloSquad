// Catálogo pt-BR (ADR-0010), um arquivo por área. Toda chave nova entra aqui antes de ir para a tela.
import auth from "./auth.json";
import common from "./common.json";
import content from "./content.json";
import conversation from "./conversation.json";
import home from "./home.json";
import onboarding from "./onboarding.json";
import pages from "./pages.json";
import shell from "./shell.json";
import site from "./site.json";
import system from "./system.json";

const messages = { common, site, auth, onboarding, system, shell, home, conversation, content, pages };

export type Messages = typeof messages;
export default messages;
