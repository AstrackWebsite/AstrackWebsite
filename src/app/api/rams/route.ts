import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_ENABLED, aiErrorReason } from "@/lib/ai/client";
import { streamRams } from "@/lib/ai/rams";
import {
  getProjectById,
  getClient,
  getMyContext,
  staffNameMap,
  getStaff,
} from "@/lib/data";
import { CLASSIFICATION_LABEL } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Streams an AI-drafted RAMS for a project as plain text. Auth-gated; the AI
 * only ever reads project data the caller can already see via RLS.
 */
export async function POST(request: NextRequest) {
  if (!AI_ENABLED) {
    return NextResponse.json({ error: "AI is not enabled." }, { status: 503 });
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let projectId = "";
  try {
    const body = await request.json();
    projectId = String(body?.projectId ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "Missing project." }, { status: 400 });
  }

  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const [ctx, client, staff] = await Promise.all([
    getMyContext(),
    project.client_id ? getClient(project.client_id) : Promise.resolve(null),
    getStaff(),
  ]);
  const names = staffNameMap(staff);

  const stream = streamRams({
    companyName: ctx.company?.name ?? "the contractor",
    clientName: client?.name ?? null,
    address: project.address,
    reference: project.reference,
    classification: CLASSIFICATION_LABEL[project.classification] ?? project.classification,
    asb5Date: project.asb5_notification_date,
    startDate: project.start_date,
    endDate: project.end_date,
    contractsManager: project.contracts_manager_id
      ? names.get(project.contracts_manager_id) ?? null
      : null,
    supervisor: project.supervisor_id ? names.get(project.supervisor_id) ?? null : null,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n[Draft interrupted — ${aiErrorReason(err)}.]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
