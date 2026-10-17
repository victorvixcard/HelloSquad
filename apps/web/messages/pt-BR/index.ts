// Catálogo pt-BR (ADR-0010), um arquivo por área. Toda chave nova entra aqui antes de ir para a tela.
import auth from "./auth.json";
import auto from "./auto.json";
import common from "./common.json";
import content from "./content.json";
import conversation from "./conversation.json";
import envs from "./envs.json";
import home from "./home.json";
import live from "./live.json";
import memory from "./memory.json";
import onboarding from "./onboarding.json";
import pages from "./pages.json";
import projects from "./projects.json";
import shell from "./shell.json";
import site from "./site.json";
import system from "./system.json";
import team from "./team.json";
import caps from "./caps.json";
import crm from "./crm.json";
import docs from "./docs.json";
import editorial from "./editorial.json";
import growth from "./growth.json";
import results from "./results.json";
import admin from "./admin.json";
import strategy from "./strategy.json";

const messages = {
  common,
  site,
  auth,
  onboarding,
  system,
  shell,
  home,
  conversation,
  live,
  content,
  pages,
  // A1b: Projetos · Nexo, Memória da Marca, Minha Equipe & Conversas, Modo Autônomo e os ambientes de Bia, Kaia,
  // Kiwi, Max e Íris (um arquivo por área, para cada tela crescer sem mexer nas outras).
  projects,
  memory,
  team,
  auto,
  envs,
  // A2b: catálogo de pedidos, documentos das entregas e os ambientes com entrega (um arquivo por área).
  caps,
  docs,
  strategy,
  editorial,
  growth,
  crm,
  results,
  // SA2: painel do Super Admin (/admin); só vai ao browser na área do painel.
  admin,
};

export type Messages = typeof messages;
export default messages;
