import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center animate-fade-in-up">
      <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm p-12 text-center shadow-lg ring-1 ring-surface-200/60 max-w-md w-full">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-danger-100/40 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary-100/30 blur-2xl" />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-danger-500 to-danger-600 text-white shadow-lg mb-6">
            <ShieldX className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Unauthorized</h1>
          <p className="mt-3 text-surface-500">You do not have permission to access this page.</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 btn-gradient rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
