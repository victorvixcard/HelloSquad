"use client";

import { Button } from "@hellosquad/ui";
import { useActionState } from "react";
import { TextField } from "@/components/TextField";
import { signUp, type AuthFormState } from "@/lib/auth-actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  return (
    <form action={action} className="hs-form" noValidate>
      <TextField
        label="Seu nome"
        name="name"
        autoComplete="name"
        required
        maxLength={120}
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />
      <TextField
        label="Seu e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="voce@seunegocio.com.br"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Crie uma senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        reveal
        hint="Pelo menos 6 caracteres."
        error={state.fieldErrors?.password}
      />
      {state.error ? (
        <p className="hs-form-err" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" block state={pending ? "loading" : "rest"} loadingLabel="Criando sua conta">
        Criar conta grátis
      </Button>
    </form>
  );
}
