export type UserRole = "agent" | "user" | "admin";

export type CreditRequestStatus = "pending" | "approved" | "rejected";

export type PaymentProvider = "manual" | "qpay";

export type QPayDeeplink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

export type ImageAspectRatio = "1:1" | "4:5" | "16:9" | "9:16";

export type TariffRow = {
  id: string;
  name: string;
  multiplier: number;
  created_at: string;
};

export type ModelRow = {
  id: string;
  name: string;
  base_cost: number;
  created_at: string;
};

export type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  tariff_id: string | null;
  referral_code: string | null;
  referred_by_user_id: string | null;
  created_at: string;
};

export type WalletRow = {
  id: string;
  user_id: string;
  credits: number;
  created_at: string;
};

export type GenerationRow = {
  id: string;
  user_id: string;
  model_name: string;
  prompt: string;
  aspect_ratio: ImageAspectRatio;
  cost: number;
  image_url: string;
  created_at: string;
};

export type CreditRequestRow = {
  id: string;
  user_id: string;
  amount: number;
  amount_mnt: number | null;
  bonus_credits: number;
  package_key: string | null;
  payment_screenshot_url: string | null;
  payment_provider: PaymentProvider;
  status: CreditRequestStatus;
  qpay_invoice_id: string | null;
  qpay_sender_invoice_no: string | null;
  qpay_payment_id: string | null;
  qpay_payment_status: string | null;
  qpay_short_url: string | null;
  qpay_qr_text: string | null;
  qpay_qr_image: string | null;
  qpay_deeplink: QPayDeeplink[] | null;
  paid_at: string | null;
  created_at: string;
};

export type AgentRequestRow = {
  id: string;
  user_id: string;
  amount_mnt: number;
  payment_screenshot_url: string | null;
  payment_provider: PaymentProvider;
  status: CreditRequestStatus;
  qpay_invoice_id: string | null;
  qpay_sender_invoice_no: string | null;
  qpay_payment_id: string | null;
  qpay_payment_status: string | null;
  qpay_short_url: string | null;
  qpay_qr_text: string | null;
  qpay_qr_image: string | null;
  qpay_deeplink: QPayDeeplink[] | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerationPricingPreview = {
  model_name: string;
  model_label: string;
  base_cost: number;
  current_role: UserRole;
  current_role_label: string;
  current_tariff_name: string;
  current_multiplier: number;
  current_cost: number;
  regular_user_multiplier: number;
  regular_user_cost: number;
  agent_multiplier: number;
  agent_cost: number;
};

export type ReferralSummaryRow = {
  invited_users: number;
  reward_events: number;
  earned_amount_mnt: number;
  available_amount_mnt: number;
  pending_payout_amount_mnt: number;
  paid_out_amount_mnt: number;
  converted_amount_mnt: number;
};

export type ReferralActivityRow = {
  referred_user_id: string;
  referred_user_email: string;
  referred_user_role: UserRole;
  joined_at: string;
  reward_events: number;
  earned_amount_mnt: number;
  last_reward_at: string | null;
};

export type ReferralPayoutRequestRow = {
  id: string;
  user_id: string;
  amount_mnt: number;
  bank_name: string;
  account_holder: string;
  account_number: string;
  status: CreditRequestStatus;
  created_at: string;
  updated_at: string;
};

export type PlatformSettingsRow = {
  id: true;
  credit_price_mnt: number;
  created_at: string;
  updated_at: string;
};

