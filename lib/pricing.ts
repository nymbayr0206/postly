import type { GenerationPricingPreview, TariffRow, UserRole } from "@/lib/types";

export function calculateFinalCreditCost(baseCost: number, multiplier: number) {
  return Math.max(1, Math.ceil(baseCost * multiplier));
}

export function getDefaultTariffNameForRole(role: UserRole) {
  return role === "agent" ? "Agent" : "Regular User";
}

export function getRoleLabel(role: UserRole) {
  if (role === "agent") {
    return "Агент";
  }

  if (role === "admin") {
    return "Админ";
  }

  return "Энгийн хэрэглэгч";
}

export function getModelDisplayName(modelName: string) {
  const labels: Record<string, string> = {
    "nano-banana-2": "NanoBanana зураг",
    nanobanana: "NanoBanana зураг",
    "elevenlabs/text-to-dialogue-v3": "ElevenLabs аудио",
    "runway/gen4-turbo": "Runway видео",
  };

  return labels[modelName] ?? modelName;
}

export function buildGenerationPricingPreview(params: {
  modelName: string;
  baseCost: number;
  tariffs: TariffRow[];
  currentRole: UserRole;
  currentTariffId: string | null;
}): GenerationPricingPreview {
  const regularTariff = params.tariffs.find((tariff) => tariff.name === "Regular User");
  const agentTariff = params.tariffs.find((tariff) => tariff.name === "Agent");

  if (!regularTariff || !agentTariff) {
    throw new Error("Тарифын мэдээлэл дутуу байна.");
  }

  const fallbackTariffName = getDefaultTariffNameForRole(params.currentRole);
  const currentTariff =
    params.tariffs.find((tariff) => tariff.id === params.currentTariffId) ??
    params.tariffs.find((tariff) => tariff.name === fallbackTariffName) ??
    regularTariff;

  return {
    model_name: params.modelName,
    model_label: getModelDisplayName(params.modelName),
    base_cost: params.baseCost,
    current_role: params.currentRole,
    current_role_label: getRoleLabel(params.currentRole),
    current_tariff_name: currentTariff.name,
    current_multiplier: currentTariff.multiplier,
    current_cost: calculateFinalCreditCost(params.baseCost, currentTariff.multiplier),
    regular_user_multiplier: regularTariff.multiplier,
    regular_user_cost: calculateFinalCreditCost(params.baseCost, regularTariff.multiplier),
    agent_multiplier: agentTariff.multiplier,
    agent_cost: calculateFinalCreditCost(params.baseCost, agentTariff.multiplier),
  };
}

