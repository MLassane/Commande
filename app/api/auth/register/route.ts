import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  try {
    const user = await createUser(email, password);
    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    if (err instanceof Error && err.message === "email_already_used") {
      return NextResponse.json({ error: "email_already_used" }, { status: 409 });
    }
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }
}
