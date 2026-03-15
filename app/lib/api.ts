/**
 * Shared API base URL — reads from NEXT_PUBLIC_BACKEND_URL env var.
 * All client-side fetch calls should prefix with this.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";
