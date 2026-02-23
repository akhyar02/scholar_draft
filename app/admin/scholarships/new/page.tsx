import { AdminScholarshipForm } from "@/components/admin-scholarship-form";
import { requirePageUser } from "@/lib/page-auth";

export default async function NewScholarshipPage() {
  await requirePageUser("admin");
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-surface-900">Create Scholarship</h1>
        <p className="mt-2 text-surface-600">Fill in the details below to create a new scholarship opportunity.</p>
      </div>
      <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-surface-200">
        <AdminScholarshipForm />
      </div>
    </div>
  );
}
