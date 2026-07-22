import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");
  return (
    <main className="admin-access">
      <Link className="brand" href="/"><span>A</span>AURUM</Link>
      <div>
        <span>Painel administrativo</span>
        <h1>Gerencie sua loja.</h1>
        <p>Entre com a senha configurada na Vercel para cadastrar relógios, preços, estoque e fotos.</p>
        <LoginForm />
      </div>
    </main>
  );
}
