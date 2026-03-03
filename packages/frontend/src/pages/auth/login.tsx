import { BrandingPanel } from '@/components/auth/branding-panel';
import { LoginForm } from '@/components/auth/login-form';

export function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <BrandingPanel />
      <div className="flex w-full lg:w-[40%] items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
