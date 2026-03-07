export const PAYMENT_REVIEW_MINUTES = 30;

export function getAdminBankDetails() {
  return {
    bankName: process.env.AGENT_BANK_NAME ?? "Хаан Банк",
    accountNumber: process.env.AGENT_BANK_ACCOUNT ?? "5000-1234-5678",
    accountHolder: process.env.AGENT_BANK_RECIPIENT ?? "Postly ХХК",
  };
}
