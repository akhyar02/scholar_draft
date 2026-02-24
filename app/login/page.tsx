import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getPostLoginRedirectPath } from "@/lib/auth/redirects";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect(getPostLoginRedirectPath(user.role));
  }

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-surface-200/50 flex flex-col md:flex-row animate-fade-in-up">
        {/* Image Section */}
        <div className="relative hidden md:block md:w-1/2 bg-surface-950">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop"
            alt="Students studying"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-br from-surface-950/80 via-primary-950/40 to-surface-950/90" />
          <div className="absolute inset-0 bg-linear-to-t from-surface-950 via-transparent to-transparent" />
          
          {/* Decorative elements */}
          <div className="absolute top-16 right-12 h-32 w-32 rounded-full bg-primary-500/15 blur-2xl animate-shimmer" />
          <div className="absolute top-1/3 left-8 h-24 w-24 rounded-full bg-accent-500/10 blur-2xl animate-shimmer animate-delay-200" />
          
          <div className="absolute bottom-0 left-0 p-12 text-white">
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="mt-4 text-surface-300 leading-relaxed">
              Log in to manage your applications, review candidates, and discover new opportunities.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full p-8 sm:p-12 md:w-1/2 lg:p-16 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl font-bold text-surface-900">Sign in to <span className="text-gradient">YUM ScholarHub</span></h1>
              <p className="mt-2 text-sm text-surface-500">
                Enter your credentials to access your account
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
