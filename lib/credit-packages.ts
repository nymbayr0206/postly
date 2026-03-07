export type CreditPackageKey = "starter" | "growth" | "pro" | "scale";

export type CreditPackage = {
  key: CreditPackageKey;
  label: string;
  priceMnt: number;
  baseCredits: number;
  bonusPercent: number;
  badge?: string;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    key: "starter",
    label: "Эхлэл",
    priceMnt: 10000,
    baseCredits: 10000,
    bonusPercent: 0,
  },
  {
    key: "growth",
    label: "Стандарт",
    priceMnt: 30000,
    baseCredits: 30000,
    bonusPercent: 0,
  },
  {
    key: "pro",
    label: "Өсөлт",
    priceMnt: 50000,
    baseCredits: 50000,
    bonusPercent: 5,
    badge: "Бонус 5%",
  },
  {
    key: "scale",
    label: "Макс",
    priceMnt: 100000,
    baseCredits: 100000,
    bonusPercent: 10,
    badge: "Бонус 10%",
  },
];

export function getBonusCredits(pkg: CreditPackage) {
  return Math.round((pkg.baseCredits * pkg.bonusPercent) / 100);
}

export function getTotalCredits(pkg: CreditPackage) {
  return pkg.baseCredits + getBonusCredits(pkg);
}

export function getCreditPackageByKey(key: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.key === key) ?? null;
}
