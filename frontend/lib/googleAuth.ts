/**
 * Volentify Google OAuth 2.0 Client Utility
 * Direct redirection to Google's official Sign-In authorization service.
 */

export function initiateGoogleSignIn(role: string = 'VOLUNTEER') {
  if (typeof window === 'undefined') return;

  // Persist intended role for onboarding upon OAuth callback
  sessionStorage.setItem('volentify_intended_role', role);

  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const origin = window.location.origin;
  const redirectUri = `${origin}/auth/callback`;

  // Construct official Google OAuth 2.0 Authorization Endpoint
  const params = new URLSearchParams({
    client_id: clientId || '789234891234-placeholder.apps.googleusercontent.com',
    redirect_uri: redirectUri,
    response_type: 'token id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    nonce: Math.random().toString(36).substring(2),
    state: role
  });

  // Directly navigate to Google's official sign-in page
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
