import { redirect } from "next/navigation";

const TRAINED_CHATGPT_URL =
  "https://chatgpt.com/g/g-69b6e113f94481918f10085023c5f44d-postly-content-zovlokh";

export default function DashboardChatGptPage() {
  redirect(TRAINED_CHATGPT_URL);
}
