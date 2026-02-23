import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-surface-200 flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="relative hidden md:block md:w-1/2 bg-primary-900">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop"
            alt="Students studying"
            className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 to-transparent" />
          <div className="absolute bottom-0 left-0 p-12 text-white">
            <h2 className="text-3xl font-bold">Welcome Back</h2>
            <p className="mt-4 text-primary-100">
              Log in to manage your applications, review candidates, and discover new opportunities.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full p-8 sm:p-12 md:w-1/2 lg:p-16 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-2xl font-bold text-surface-900">Sign in to YUM ScholarHub</h1>
              <p className="mt-2 text-sm text-surface-600">
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
