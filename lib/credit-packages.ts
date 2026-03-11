export type CreditPackageKey = "starter" | "growth" | "pro" | "scale";

export type CreditPackage = {
  key: CreditPackageKey;
  label: string;
  priceMnt: number;
  bonusPercent: number;
  badge?: string;
};

export const DEFAULT_CREDIT_PRICE_MNT = 20;

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    key: "starter",
    label: "Эхлэл",
    priceMnt: 10000,
    bonusPercent: 0,
  },
  {
    key: "growth",
    label: "Стандарт",
    priceMnt: 30000,
    bonusPercent: 0,
  },
  {
    key: "pro",
    label: "Өсөлт",
    priceMnt: 50000,
    bonusPercent: 5,
    badge: "Бонус 5%",
  },
  {
    key: "scale",
    label: "Макс",
    priceMnt: 100000,
    bonusPercent: 10,
    badge: "Бонус 10%",
  },
];

function normalizeCreditPrice(creditPriceMnt: number) {
  return Number.isFinite(creditPriceMnt) && creditPriceMnt > 0
    ? Math.floor(creditPriceMnt)
    : DEFAULT_CREDIT_PRICE_MNT;
}

export function getBaseCredits(pkg: CreditPackage, creditPriceMnt = DEFAULT_CREDIT_PRICE_MNT) {
  const effectiveCreditPrice = normalizeCreditPrice(creditPriceMnt);
  return Math.max(1, Math.floor(pkg.priceMnt / effectiveCreditPrice));
}

export function getBonusCredits(pkg: CreditPackage, creditPriceMnt = DEFAULT_CREDIT_PRICE_MNT) {
  return Math.round((getBaseCredits(pkg, creditPriceMnt) * pkg.bonusPercent) / 100);
}

export function getTotalCredits(pkg: CreditPackage, creditPriceMnt = DEFAULT_CREDIT_PRICE_MNT) {
  return getBaseCredits(pkg, creditPriceMnt) + getBonusCredits(pkg, creditPriceMnt);
}

export function getCreditPackageByKey(key: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.key === key) ?? null;
}
