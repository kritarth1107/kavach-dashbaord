import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PostLoginRedirect } from "@/components/auth/post-login-redirect";

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PostLoginRedirect />
    </Suspense>
  );
}
