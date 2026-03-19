import { redirect } from "next/navigation";
import { getSecondMeConnectionState } from "@/lib/secondme";

export function sanitizeReturnPath(input?: string | null) {
  if (!input) return "/";
  if (!input.startsWith("/")) return "/";
  if (input.startsWith("//")) return "/";
  return input;
}

export async function ensureSecondMeAuthorized(returnPath: string) {
  const state = await getSecondMeConnectionState();
  if (state.isConnected) {
    return;
  }

  const safeReturnPath = sanitizeReturnPath(returnPath);
  redirect(`/api/auth/login?return_to=${encodeURIComponent(safeReturnPath)}`);
}
