/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/jobs',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/jobs',
  },
};

export default nextConfig;
