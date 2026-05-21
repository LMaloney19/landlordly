/** fetch with auth cookies attached (no server-side refresh — avoids token races). */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
  });
}
