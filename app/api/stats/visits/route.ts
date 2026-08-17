import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantId } from "@/lib/admin-tenant";
import { getVisitsForRange } from "@/lib/visits";

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    tenantId = await requireAdminTenantId();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const period = req.nextUrl.searchParams.get("period") || "today";
  const days = period === "today" ? 1 : period === "7days" ? 7 : 30;

  const visits = await getVisitsForRange(tenantId, days);
  return NextResponse.json({ visits });
}
