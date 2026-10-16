// Catálogo es (ADR-0010): mesmas áreas e chaves do pt-BR; o tipo Messages acusa chave faltando.
import type { Messages } from "../pt-BR";
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

const messages: Messages = {
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
  projects,
  memory,
  team,
  auto,
  envs,
};

export default messages;
