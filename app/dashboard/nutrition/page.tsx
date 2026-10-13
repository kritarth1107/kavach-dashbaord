import { Suspense } from "react";
import { NutritionPage } from "@/components/care-os/nutrition-page";

export default function Page() {
  return (
    <Suspense>
      <NutritionPage />
    </Suspense>
  );
}
