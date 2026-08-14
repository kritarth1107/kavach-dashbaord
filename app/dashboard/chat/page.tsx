import { Suspense } from "react";
import { ChatPage } from "@/components/dashboard/chat/chat-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}
