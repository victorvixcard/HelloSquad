"use client";

import { Button } from "@hellosquad/ui";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { TextField } from "@/components/TextField";
import { signUp, type AuthFormState } from "@/lib/auth-actions";

export function SignupForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  return (
    <form action={action} className="hs-form" noValidate>
      <TextField
        label={t("fields.name")}
        name="name"
        autoComplete="name"
        required
        maxLength={120}
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
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
        label={t("fields.newPassword")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        reveal
        hint={t("fields.newPasswordHint")}
        error={state.fieldErrors?.password}
      />
      {state.error ? (
        <p className="hs-form-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block state={pending ? "loading" : "rest"} loadingLabel={t("signUp.submitting")}>
        {t("signUp.submit")}
      </Button>
    </form>
  );
}
