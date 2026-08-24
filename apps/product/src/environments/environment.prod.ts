declare const process: { env: { NX_PUBLIC_API_BASE_URL?: string } };

const localApiBaseUrl = 'http://localhost:3000/api/v1';
const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalHost = browserHost === 'localhost' || browserHost === '127.0.0.1';
// Set at build time on Vercel; falls back to same-origin (nginx) or localhost otherwise.
const configuredApiBaseUrl = process.env.NX_PUBLIC_API_BASE_URL;

export const environment = {
  production: true,
  ecommerceApiBaseUrl:
    configuredApiBaseUrl ||
    (typeof window !== 'undefined' && !isLocalHost ? `${window.location.origin}/api/v1` : localApiBaseUrl),
} as const;