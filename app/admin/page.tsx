import type { Metadata } from "next";
import Link from "next/link";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { requireAdminPage } from "@/lib/admin-auth";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel administrativo", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { user, authorized } = await requireAdminPage("/admin");

  if (!authorized) {
    return <main className="admin-access"><Link className="brand" href="/"><span>A</span>AURUM</Link><div><span>Acesso restrito</span><h1>Esta conta não tem permissão.</h1><p>Você entrou como <strong>{user.email}</strong>. Use a conta autorizada para administrar a AURUM.</p><a className="button primary" href={chatGPTSignOutPath("/admin")}>Trocar de conta</a></div></main>;
  }

  return <AdminDashboard userName={user.displayName} />;
}
