"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { NutritionPage } from "@/components/care-os/nutrition-page";
import { usePerson } from "@/components/care-os/person-context";
import { useFeatures } from "@/lib/features";

/** Shown only once the nutrition.page switch is on (the founder approves the design first); otherwise back to Today. */
function Gate() {
  const { familyId } = usePerson();
  const features = useFeatures(familyId);
  const router = useRouter();
  const off = features !== null && !features.nutritionPage;
  useEffect(() => {
    if (off) router.replace("/dashboard");
  }, [off, router]);
  return features?.nutritionPage ? <NutritionPage /> : null;
}

export default function Page() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
