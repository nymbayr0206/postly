import { redirect } from "next/navigation";

import { LandingPage } from "@/components/marketing/landing-page";
import { getActiveModelNames } from "@/lib/env";
import {
  creditsToMnt,
  getImageResolutionCost,
  getStartingCreditsForModel,
  getVideoCredits,
} from "@/lib/generation-pricing";
import { calculateFinalCreditCost } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getModels, getPlatformSettings, getTariffs } from "@/lib/user-data";

function buildFallbackLandingPricing() {
  const creditPriceMnt = 20;
  const regularMultiplier = 10;

  const imageCredits = calculateFinalCreditCost(
    getImageResolutionCost("1k"),
    regularMultiplier,
  );
  const audioCredits = calculateFinalCreditCost(
    getStartingCreditsForModel("elevenlabs/text-to-dialogue-v3"),
    regularMultiplier,
  );
  const videoCredits = calculateFinalCreditCost(
    getVideoCredits(5, "720p"),
    regularMultiplier,
  );

  return [
    {
      kind: "image" as const,
      title: "Зураг үүсгэх",
      unitLabel: "1K зураг",
      credits: imageCredits,
      priceMnt: creditsToMnt(imageCredits, creditPriceMnt),
      description: "Product visual, poster, ad image",
    },
    {
      kind: "video" as const,
      title: "Видео үүсгэх",
      unitLabel: "5 сек 720p",
      credits: videoCredits,
      priceMnt: creditsToMnt(videoCredits, creditPriceMnt),
      description: "Эх зураг + хөдөлгөөний тайлбараас teaser clip",
    },
    {
      kind: "audio" as const,
      title: "Аудио үүсгэх",
      unitLabel: "1,000 тэмдэгт",
      credits: audioCredits,
      priceMnt: creditsToMnt(audioCredits, creditPriceMnt),
      description: "Voiceover, dialogue, branded narration",
    },
  ];
}

async function getLandingPricing() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const [tariffs, models, platformSettings] = await Promise.all([
      getTariffs(adminSupabase),
      getModels(adminSupabase),
      getPlatformSettings(adminSupabase),
    ]);
    const { nanoBananaModelName, elevenlabsModelName, runwayModelName } = getActiveModelNames();
    const modelByName = new Map(models.map((model) => [model.name, model]));
    const regularMultiplier =
      tariffs.find((tariff) => tariff.name === "Regular User")?.multiplier ?? 1;

    const imageCredits = calculateFinalCreditCost(
      getImageResolutionCost("1k", modelByName.get(nanoBananaModelName)?.base_cost),
      regularMultiplier,
    );
    const audioCredits = calculateFinalCreditCost(
      getStartingCreditsForModel(
        elevenlabsModelName,
        modelByName.get(elevenlabsModelName)?.base_cost,
      ),
      regularMultiplier,
    );
    const videoCredits = calculateFinalCreditCost(
      getVideoCredits(5, "720p", modelByName.get(runwayModelName)?.base_cost),
      regularMultiplier,
    );

    return buildFallbackLandingPricing().map((item) => {
      if (item.kind === "image") {
        return {
          ...item,
          credits: imageCredits,
          priceMnt: creditsToMnt(imageCredits, platformSettings.credit_price_mnt),
        };
      }

      if (item.kind === "video") {
        return {
          ...item,
          credits: videoCredits,
          priceMnt: creditsToMnt(videoCredits, platformSettings.credit_price_mnt),
        };
      }

      return {
        ...item,
        credits: audioCredits,
        priceMnt: creditsToMnt(audioCredits, platformSettings.credit_price_mnt),
      };
    });
  } catch {
    return buildFallbackLandingPricing();
  }
}

export default async function HomePage() {
  const pricing = await getLandingPricing();

  return <LandingPage pricing={pricing} />;
}

