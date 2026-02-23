import { jsonOk } from "@/lib/http";
import { listStudyPrograms } from "@/lib/study-programs";

export const dynamic = "force-dynamic";

export async function GET() {
  const programs = await listStudyPrograms();
  return jsonOk({ programs });
}
