"use client";

import { Button } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { TextField } from "@/components/TextField";
import { signIn, type AuthFormState } from "@/lib/auth-actions";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  return (
    <form action={action} className="hs-form" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        label={t("fields.email")}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={t("fields.emailPlaceholder")}
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        label={t("fields.password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        reveal
        error={state.fieldErrors?.password}
      />
      {state.error ? (
        <p className="hs-form-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block state={pending ? "loading" : "rest"} loadingLabel={t("signIn.submitting")}>
        {t("signIn.submit")}
      </Button>
    </form>
  );
}
