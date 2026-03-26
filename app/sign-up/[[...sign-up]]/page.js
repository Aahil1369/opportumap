import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center px-4">
      <SignUp />
    </div>
  );
}
