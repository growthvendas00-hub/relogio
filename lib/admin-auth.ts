import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser } from "@/app/chatgpt-auth";

function configuredAdminEmails() {
  const runtimeEnv = env as unknown as { ADMIN_EMAIL?: string };
  return (runtimeEnv.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return configuredAdminEmails().includes(email.toLowerCase());
}

export async function getAdminUser() {
  const user = await getChatGPTUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function requireAdminPage(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  return { user, authorized: isAdminEmail(user.email) };
}
