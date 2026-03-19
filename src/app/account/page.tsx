import { AccountClientPage } from "./account-client-page";
import { ensureSecondMeAuthorized } from "@/lib/secondme-auth-guard";

export default async function AccountPage() {
  await ensureSecondMeAuthorized("/account");
  return <AccountClientPage />;
}
