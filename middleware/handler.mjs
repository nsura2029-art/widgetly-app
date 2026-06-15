export async function handler(request, env) {
  // Minimal pass-through handler to satisfy build import.
  // Replace with your middleware logic as needed.
  return fetch(request);
}
