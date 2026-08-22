/**
 * Rate-limit budgets.
 *
 * `@Throttle()` is a decorator, so its arguments are read when the controller
 * class is first imported — before Nest builds the config service. `main.ts`
 * therefore loads the `.env` file as its very first statement, which leaves
 * `process.env` populated in local runs the same way Railway populates it in a
 * deployed one.
 */
function readLimit(key: string, fallback: number): number {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Login and registration are the endpoints worth brute-forcing, so they get a
 * far smaller budget than ordinary reads.
 *
 * Refreshing is deliberately *not* on this budget. It presents a signed,
 * high-entropy token rather than a guessable secret, so throttling it buys no
 * protection — while a storefront with several micro-frontends, a short access
 * TTL and a couple of open tabs spends refreshes quickly, and everyone behind
 * one NAT shares the per-IP counter. It stays on the default budget, and token
 * rotation with reuse detection is what actually guards it.
 */
export const CREDENTIAL_THROTTLE = {
  default: {
    limit: readLimit('AUTH_THROTTLE_LIMIT', 10),
    ttl: readLimit('AUTH_THROTTLE_TTL_SECONDS', 60) * 1000,
  },
};
