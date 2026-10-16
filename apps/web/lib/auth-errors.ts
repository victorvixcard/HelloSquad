import type { Messages } from "@/messages/pt-BR";

// Erro da Auth pelo código estável (AuthError.code) → chave da mensagem em auth.errors do catálogo.
// Quem chama traduz com getTranslations("auth.errors") e passa { min } (a mensagem de senha curta usa).

type AuthLikeError = { code?: string; status?: number; name?: string; message?: string };

export type AuthErrorKey = keyof Messages["auth"]["errors"];

const KEYS: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  user_already_exists: "accountExists",
  email_exists: "accountExists",
  weak_password: "passwordTooShort",
  email_address_invalid: "emailAddressInvalid",
  validation_failed: "validationFailed",
  over_request_rate_limit: "rateLimited",
  over_email_send_rate_limit: "rateLimited",
  email_not_confirmed: "emailNotConfirmed",
  signup_disabled: "signupDisabled",
  user_banned: "userBanned",
};

export function authErrorKey(error: AuthLikeError, fallback: AuthErrorKey): AuthErrorKey {
  if (error.code && KEYS[error.code]) return KEYS[error.code];
  if (error.status === 429) return KEYS.over_request_rate_limit;
  if (error.name === "AuthRetryableFetchError" || error.status === 0) return "serviceUnavailable";
  return fallback;
}
