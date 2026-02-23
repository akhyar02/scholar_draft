import { jsonOk } from "@/lib/http";
import { listApplicationOptionsTree } from "@/lib/application-options";

export const dynamic = "force-dynamic";

export async function GET() {
  const options = await listApplicationOptionsTree();
  return jsonOk({ options });
}
