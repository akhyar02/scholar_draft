import { AdminApplicationsClient } from "@/components/admin-applications-client";
import { fetchApplicationsPage } from "@/app/admin/applications/actions";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const initialData = await fetchApplicationsPage({ page: 1, q: "", statuses: [] });

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-surface-900">Application Review Queue</h1>
        <p className="mt-2 text-surface-500">Review and manage student scholarship applications.</p>
      </div>

      <AdminApplicationsClient initialData={initialData} />
    </div>
  );
}
