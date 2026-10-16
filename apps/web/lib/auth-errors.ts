// Mensagens da Auth em português, pelo código estável do erro (AuthError.code).

type AuthLikeError = { code?: string; status?: number; name?: string; message?: string };

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha não conferem.",
  user_already_exists: "Já existe uma conta com esse e-mail. Entre com ela.",
  email_exists: "Já existe uma conta com esse e-mail. Entre com ela.",
  weak_password: "A senha precisa de pelo menos 6 caracteres.",
  email_address_invalid: "Confira o e-mail: ele não parece válido.",
  validation_failed: "Confira o e-mail e a senha.",
  over_request_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  over_email_send_rate_limit: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  email_not_confirmed: "Confirme o seu e-mail antes de entrar.",
  signup_disabled: "O cadastro está fechado no momento.",
  user_banned: "Esta conta está bloqueada.",
};

export function authErrorMessage(error: AuthLikeError, fallback: string): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return MESSAGES.over_request_rate_limit;
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return "Não foi possível falar com o serviço de login agora. Tente de novo em instantes.";
  }
  return fallback;
}
