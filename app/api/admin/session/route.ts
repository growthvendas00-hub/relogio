import { NextResponse } from "next/server";
import { adminSessionCookie, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/login-rate-limit";
import { isAllowedMutationOrigin, readJsonBody, requestErrorStatus } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function clearSession(response: NextResponse) {
  response.cookies.set(adminSessionCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const rateLimit = consumeLoginAttempt(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." },
      { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds), "cache-control": "no-store" } },
    );
  }
  try {
    const { password } = await readJsonBody<{ password?: unknown }>(request, 1_024);
    if (typeof password !== "string" || !(await verifyAdminPassword(password))) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    clearLoginAttempts(rateLimit.key);
    response.cookies.set(adminSessionCookie.name, await createAdminSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: adminSessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível entrar." },
      { status: requestErrorStatus(error, 500) },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedMutationOrigin(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  clearSession(response);
  return response;
}
