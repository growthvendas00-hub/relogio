"use client";

import { useState } from "react";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label htmlFor="admin-password">Senha administrativa</label>
      <input id="admin-password" type="password" autoComplete="current-password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} />
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button className="button primary" disabled={loading}>{loading ? "Entrando..." : "Entrar no painel"}</button>
    </form>
  );
}
