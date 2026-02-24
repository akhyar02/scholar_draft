import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminScholarshipRow } from "@/components/admin-scholarship-row";
import { getDb } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminScholarshipsPage() {
  await requirePageUser("admin");
  const db = getDb();

  const scholarships = await db.selectFrom("scholarships").selectAll().orderBy("created_at", "desc").execute();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Manage Scholarships</h1>
          <p className="mt-2 text-surface-500">Create and manage scholarship opportunities.</p>
        </div>
        <Link 
          href="/admin/scholarships/new" 
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md"
        >
          <Plus className="h-4 w-4" />
          New Scholarship
        </Link>
      </div>
      
      <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-surface-200/60 backdrop-blur-sm animate-fade-in-up animate-delay-100">
        <div className="divide-y divide-surface-100">
          {scholarships.map((scholarship) => (
            <AdminScholarshipRow
              key={scholarship.id}
              scholarship={{
                id: scholarship.id,
                title: scholarship.title,
                deadline_at: scholarship.deadline_at.toISOString(),
                is_published: scholarship.is_published,
              }}
            />
          ))}
          {scholarships.length === 0 && (
            <div className="p-16 text-center text-surface-500">
              No scholarships found. Create one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
