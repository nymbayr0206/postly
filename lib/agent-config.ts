export const AGENT_SIGNUP_PRICE_MNT = 150000;
export const AGENT_APPROVAL_CREDITS = 50000;

export function getAgentBankDetails() {
  return {
    bankName: process.env.AGENT_BANK_NAME ?? "Хаан Банк",
    accountNumber: process.env.AGENT_BANK_ACCOUNT ?? "5000-1234-5678",
    accountHolder: process.env.AGENT_BANK_RECIPIENT ?? "Postly ХХК",
  };
}
