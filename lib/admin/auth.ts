import { cookies } from "next/headers";
import { ADMIN_SESSION_SECRET } from "@/lib/admin/config";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();

  const session = cookieStore.get("admin_session")?.value;

  if (!session) {
    return false;
  }

  return session === ADMIN_SESSION_SECRET;
}