export function calculateFinalCreditCost(baseCost: number, multiplier: number) {
  return Math.max(1, Math.ceil(baseCost * multiplier));
}

