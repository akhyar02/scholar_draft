import { AdminApplicationOptionsManager } from "@/components/admin-application-options-manager";
import { listApplicationOptionsTree } from "@/lib/application-options";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminProgramsPage() {
  await requirePageUser("admin");
  const options = await listApplicationOptionsTree();

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Manage Application Options</h1>
        <p className="mt-2 text-surface-600">
          Configure campus, faculty, course, and support provider options used in V2 applications.
        </p>
      </div>
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-sm ring-1 ring-surface-200/60">
        <AdminApplicationOptionsManager initialOptions={options} />
      </div>
    </div>
  );
}
