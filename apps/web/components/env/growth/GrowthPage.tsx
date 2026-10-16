import { loadWorkspaceCore } from "@/lib/core";
import type { EnvPageProps } from "../env-page";
import { GrowthEnvironment } from "./GrowthEnvironment";
import type { KiwiWork } from "./growth-types";
import { list, num, obj, str, workState, worksWithContent } from "./work-content";

/**
 * Growth Marketing · Kiwi: objetivo, frentes e o vazio honesto (A1b). A2b: "Campanhas pagas" lista os planos de mídia
 * (05.01) e os testes de anúncios (05.02) que existem, com o link para cada documento. Nada é investido nem ativado.
 */
export async function GrowthPage({ workspace, needs }: EnvPageProps) {
  const core = await loadWorkspaceCore(workspace.id);
  const works = await worksWithContent(core.workItems, ["05.01", "05.02"]);
  const paid: KiwiWork[] = works.map(({ work, version }) => {
    const c = version?.content ?? {};
    const base = {
      id: work.id,
      title: str(c.titulo) || work.title,
      state: workState(work.status),
      awaiting: work.awaiting_you,
      href: `/app/${workspace.slug}/squad/kiwi/trabalho/${work.id}`,
    };
    if (work.delivery_type === "05.01") {
      const budget = obj(c.orcamento);
      return {
        ...base,
        kind: "plan",
        ceiling: num(budget.teto_proposto),
        period: str(budget.periodo),
        split: list(budget.distribuicao).map((d) => ({ channel: str(d.canal), value: num(d.valor) })),
        limits: list(c.limites).map(str).filter(Boolean),
        goal: str(obj(list(c.objetivos)[0]).objetivo),
        audience: list(c.canais).map((x) => str(x.publico)).filter(Boolean),
      };
    }
    const plan = obj(c.plano_de_midia);
    return {
      ...base,
      kind: "tests",
      audiences: list(c.publicos).map((p) => str(p.nome)).filter(Boolean),
      tests: list(c.testes).map((x) => ({
        order: num(x.ordem),
        hypothesis: str(x.hipotese),
        variable: str(x.variavel),
        duration: str(x.duracao),
        budget: num(x.verba),
      })),
      plan: num(plan.versao) !== null ? { no: num(plan.versao)!, ceiling: num(plan.teto_proposto) } : null,
    };
  });
  return <GrowthEnvironment business={workspace.name} needs={needs} paid={paid} />;
}
