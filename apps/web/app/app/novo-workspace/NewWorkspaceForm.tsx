"use client";

import { Button } from "@hellosquad/ui";
import { useActionState, useState } from "react";
import { TextField } from "@/components/TextField";
import { createWorkspace } from "./actions";
import { slugify, type WorkspaceFormState } from "./validation";

export function NewWorkspaceForm() {
  const [state, action, pending] = useActionState<WorkspaceFormState, FormData>(createWorkspace, {});
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  return (
    <form action={action} className="hs-form" noValidate>
      <TextField
        label="Nome do negócio"
        name="name"
        autoComplete="organization"
        required
        maxLength={120}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (!slugEdited) setSlug(slugify(event.target.value));
        }}
        error={state.fieldErrors?.name}
      />
      <TextField
        label="Endereço do seu squad"
        name="slug"
        required
        minLength={3}
        maxLength={48}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={slug}
        onChange={(event) => {
          setSlugEdited(true);
          setSlug(event.target.value.toLowerCase());
        }}
        hint={
          <>
            Letras minúsculas, números e hífen, de 3 a 48 caracteres. Fica assim:{" "}
            <span className="font-mono">/app/{slug || "seu-negocio"}</span>
          </>
        }
        error={state.fieldErrors?.slug}
      />
      {state.error ? (
        <p className="hs-form-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block state={pending ? "loading" : "rest"} loadingLabel="Criando">
        Criar e entrar
      </Button>
    </form>
  );
}
