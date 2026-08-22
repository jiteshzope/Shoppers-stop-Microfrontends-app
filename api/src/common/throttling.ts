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
 * Credential endpoints — login, register, refresh — are the ones worth
 * brute-forcing, so they get a far smaller budget than ordinary reads.
 */
export const CREDENTIAL_THROTTLE = {
  default: {
    limit: readLimit('AUTH_THROTTLE_LIMIT', 10),
    ttl: readLimit('AUTH_THROTTLE_TTL_SECONDS', 60) * 1000,
  },
};
