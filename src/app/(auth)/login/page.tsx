import LoginForm from "@/components/auth/LoginForm";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
      <p className="text-gray-500 text-sm mb-6">Sign in to your Ahangama account</p>
      <LoginForm callbackUrl={callbackUrl || "/"} />
    </>
  );
}
