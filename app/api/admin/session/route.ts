import { NextResponse } from "next/server";
import { adminSessionCookie, createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { isAllowedMutationOrigin } from "@/lib/request-security";

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
  try {
    const { password } = (await request.json()) as { password?: unknown };
    if (typeof password !== "string" || !(await verifyAdminPassword(password))) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(adminSessionCookie.name, await createAdminSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: adminSessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível entrar." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedMutationOrigin(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  clearSession(response);
  return response;
}
