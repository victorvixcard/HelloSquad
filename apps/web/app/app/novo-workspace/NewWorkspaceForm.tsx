"use client";

import { Button } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { TextField } from "@/components/TextField";
import { createWorkspace } from "./actions";
import { slugify, type WorkspaceFormState } from "./validation";

export function NewWorkspaceForm() {
  const t = useTranslations("onboarding.form");
  const [state, action, pending] = useActionState<WorkspaceFormState, FormData>(createWorkspace, {});
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  return (
    <form action={action} className="hs-form" noValidate>
      <TextField
        label={t("name")}
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
        label={t("slug")}
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
        hint={t.rich("slugHint", {
          slug: slug || t("slugExample"),
          code: (chunks) => <span className="font-mono">{chunks}</span>,
        })}
        error={state.fieldErrors?.slug}
      />
      {state.error ? (
        <p className="hs-form-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block state={pending ? "loading" : "rest"} loadingLabel={t("submitting")}>
        {t("submit")}
      </Button>
    </form>
  );
}
