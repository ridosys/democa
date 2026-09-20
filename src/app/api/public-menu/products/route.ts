import { NextResponse, type NextRequest } from "next/server";
import { getPublicMenuProducts } from "@/features/public-menu/queries";
import { hasFeature } from "@/lib/features";

/**
 * Anonymous by design, like the rest of the public QR menu — no admin
 * session exists on this surface. Gated only on the QR_ORDERING feature
 * flag (mirrors fetchPublicProductOptionGroups in
 * src/features/public-menu/actions.ts). Read-only: returns the exact same
 * ACTIVE-product fields the page already renders server-side for page one,
 * just paginated instead of sent all at once.
 */
export async function GET(request: NextRequest) {
  if (!(await hasFeature("QR_ORDERING"))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const offset = Number(params.get("offset")) || 0;
  const categoryId = params.get("categoryId");
  const q = params.get("q");

  const feed = await getPublicMenuProducts({
    offset: offset > 0 ? offset : 0,
    categoryId: categoryId && categoryId !== "ALL" ? categoryId : null,
    q,
  });

  return NextResponse.json(feed);
}
