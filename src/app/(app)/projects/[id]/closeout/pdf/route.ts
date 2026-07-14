import { createClient } from "@/lib/supabase/server";
import { buildCloseoutPack } from "@/lib/pdf/buildCloseoutPack";
import { parseSections, ALL_SECTION_KEYS } from "@/lib/closeoutSections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const sectionsParam = new URL(req.url).searchParams.get("sections");
  const sections = parseSections(sectionsParam);
  const partial = sections.length !== ALL_SECTION_KEYS.length;

  const pack = await buildCloseoutPack(params.id, { sections });
  if (!pack) return new Response("Not found", { status: 404 });

  const slug = partial ? "report" : pack.completed ? "closeout" : "report";
  return new Response(Buffer.from(pack.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-${pack.reference}.pdf"`,
    },
  });
}
