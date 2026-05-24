import type { Metadata } from "next";
import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

export const metadata: Metadata = { title: "Verificar email" };

interface Props {
  searchParams: Promise<{
    token?: string;
    email?: string;
    unverified?: string;
  }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <VerifyEmailClient
      token={params.token}
      email={params.email ?? params.unverified}
    />
  );
}
