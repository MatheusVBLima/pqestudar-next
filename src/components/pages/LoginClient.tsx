"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const Login = dynamic(() => import("@/legacy-pages/Login"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    </div>
  ),
});

export default function LoginClient() {
  return <Login />;
}
