export type UserRole = "agent" | "user" | "admin";

export type CreditRequestStatus = "pending" | "approved" | "rejected";

export type ImageAspectRatio = "1:1" | "4:5" | "16:9";

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
  status: CreditRequestStatus;
  created_at: string;
};

export type AgentRequestRow = {
  id: string;
  user_id: string;
  amount_mnt: number;
  payment_screenshot_url: string | null;
  status: CreditRequestStatus;
  created_at: string;
  updated_at: string;
};

