import { doubleCsrf } from 'csrf-csrf';

// Anti-CSRF protection using the double-submit-cookie pattern (csrf-csrf).
//
// How it works:
//   1. The client calls GET /api/csrf-token. The server generates a token that
//      is an HMAC bound to the user's session (the auth JWT) and a secret, sets
//      it in a cookie AND returns it in the JSON body.
//   2. On every state-changing request the client echoes the token back in the
//      `x-csrf-token` header. The middleware checks that the header matches the
//      cookie and that the HMAC is valid for this session.
//
// Why a cross-site attacker cannot pass this check:
//   - They cannot READ the token: the response body is protected by CORS (only
//     the client origin may read it) and the cookie is httpOnly.
//   - They cannot GUESS/forge it: it is an HMAC keyed with a server secret.
//   - A hidden <form> can't set custom headers, so the header is never sent.
// CORS and SameSite do not replace this: CORS only hides responses, and
// SameSite treats localhost:1337 and localhost:4000 as the same site.

const isProduction = process.env.NODE_ENV === 'production';

// Pre-auth routes run before a session exists, so there is nothing to forge
// against yet. They are exempt (everything else that mutates is protected).
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  // Read lazily so the secret can be provided after this module is imported
  // (dotenv / tests). Falls back to JWT_SECRET so existing .env files still work.
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  // Bind the token to the logged-in session so a token can't be reused across users.
  getSessionIdentifier: (req) => req.cookies?.token || '',
  cookieName: 'csrf_token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/'
  },
  // Safe methods (GET/HEAD/OPTIONS) are ignored by default.
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  skipCsrfProtection: (req) => EXEMPT_PATHS.has(req.originalUrl.split('?')[0])
});

export { invalidCsrfTokenError, doubleCsrfProtection };

// GET /api/csrf-token
export function getCsrfToken(req, res) {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
}
