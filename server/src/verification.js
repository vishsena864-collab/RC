// Age-verification hook.
//
// The adult category calls isVerifiedAdult() before letting anyone in. This is a deliberate stub that
// always says "not verified" so the category stays closed until a real provider (ID check or face-age
// estimation, e.g. Yoti or Persona) is connected here.
//
// To wire a provider:
//   1. The web app obtains a signed token / session id from the provider after the user verifies.
//   2. It sends that token in the `join` payload as `verifyToken`.
//   3. Validate it here against the provider's API (server to server) and return true only on success.
//   4. Set ADULT_ENABLED=true in the server environment.

export async function isVerifiedAdult(_verifyToken) {
  return false;
}
