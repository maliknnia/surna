// client/src/lib/auth.ts
import { queryClient, apiRequest } from "./queryClient";
import { clearCsrfToken } from "./csrf";

export async function logout() {
  try {
    await apiRequest("POST", "/api/auth/logout");
  } catch {
    // Session may already be gone — still clear client state
  }
  clearCsrfToken();
  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  queryClient.clear();
  window.location.href = "/login";
}
