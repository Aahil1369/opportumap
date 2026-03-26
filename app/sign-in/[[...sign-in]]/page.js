import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center px-4">
      <SignIn />
    </div>
  );
}
