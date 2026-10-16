import { Agent, AGENT_IDS, Button } from "@hellosquad/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <p className="font-display text-5xl font-extrabold tracking-[-0.02em]">HelloSquad</p>
      <div className="flex gap-3">
        {AGENT_IDS.map((id) => (
          <Agent key={id} agent={id} size={40} />
        ))}
      </div>
      <Button href="/criar-conta">Criar conta grátis</Button>
    </main>
  );
}
