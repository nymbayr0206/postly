import { getQPayEnv } from "@/lib/env";

export type QPayDeeplink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

type QPayTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

type QPayInvoiceResponse = {
  invoice_id: string;
  qr_text: string;
  qr_image: string;
  qPay_shortUrl?: string;
  qPay_deeplink?: QPayDeeplink[];
};

type QPayPaymentCheckRow = {
  payment_id: string;
  payment_status: string;
  payment_amount: string | number;
  trx_fee?: string | number;
  payment_currency?: string;
  payment_wallet?: string;
  payment_type?: string;
  next_payment_date?: string | null;
  next_payment_datetime?: string | null;
  card_transactions?: unknown[];
  p2p_transactions?: unknown[];
};

type QPayPaymentCheckResponse = {
  count?: number;
  paid_amount?: string | number;
  rows?: QPayPaymentCheckRow[];
};

export type QPayPaymentGetResponse = {
  payment_id: string;
  payment_status: string;
  payment_amount: string | number;
  payment_fee?: string | number;
  payment_currency?: string;
  payment_date?: string;
  payment_wallet?: string;
  transaction_type?: string;
  object_type?: string;
  object_id?: string;
  next_payment_date?: string | null;
  next_payment_datetime?: string | null;
  card_transactions?: unknown[];
  p2p_transactions?: unknown[];
};

type QPayTokenCache = {
  accessToken: string;
  expiresAt: number;
  refreshToken: string | null;
  refreshExpiresAt: number | null;
};

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

let tokenCache: QPayTokenCache | null = null;

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseQPayError(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const parts = [record.message, record.error, record.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return `QPAY_HTTP_${status}`;
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildTokenCache(payload: QPayTokenResponse): QPayTokenCache {
  const now = Date.now();
  const expiresInSeconds = Math.max(0, Number(payload.expires_in ?? 0));
  const refreshExpiresInSeconds = Math.max(0, Number(payload.refresh_expires_in ?? 0));

  return {
    accessToken: payload.access_token,
    expiresAt: now + Math.max(0, expiresInSeconds * 1000 - TOKEN_EXPIRY_BUFFER_MS),
    refreshToken: payload.refresh_token ?? null,
    refreshExpiresAt: payload.refresh_token
      ? now + Math.max(0, refreshExpiresInSeconds * 1000 - TOKEN_EXPIRY_BUFFER_MS)
      : null,
  };
}

async function requestNewToken() {
  const { qpayBaseUrl, qpayPassword, qpayUsername } = getQPayEnv();
  const basic = Buffer.from(`${qpayUsername}:${qpayPassword}`).toString("base64");

  const response = await fetch(`${trimTrailingSlashes(qpayBaseUrl)}/v2/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
    cache: "no-store",
  });

  const payload = (await readJsonSafely(response)) as QPayTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(parseQPayError(payload, response.status));
  }

  tokenCache = buildTokenCache(payload);

  return tokenCache.accessToken;
}

async function refreshToken(refreshToken: string) {
  const { qpayBaseUrl } = getQPayEnv();
  const response = await fetch(`${trimTrailingSlashes(qpayBaseUrl)}/v2/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
    cache: "no-store",
  });

  const payload = (await readJsonSafely(response)) as QPayTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(parseQPayError(payload, response.status));
  }

  tokenCache = buildTokenCache({
    ...payload,
    refresh_token: payload.refresh_token ?? refreshToken,
  });

  return tokenCache.accessToken;
}

async function getAccessToken() {
  const now = Date.now();

  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  if (
    tokenCache?.refreshToken &&
    tokenCache.refreshExpiresAt &&
    now < tokenCache.refreshExpiresAt
  ) {
    try {
      return await refreshToken(tokenCache.refreshToken);
    } catch {
      tokenCache = null;
    }
  }

  return requestNewToken();
}

async function qpayFetch<T>(path: string, init?: RequestInit) {
  const { qpayBaseUrl } = getQPayEnv();
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${trimTrailingSlashes(qpayBaseUrl)}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const payload = (await readJsonSafely(response)) as T | null;

  if (!response.ok) {
    throw new Error(parseQPayError(payload, response.status));
  }

  return payload as T;
}

export function normalizeQPayDeeplinks(value: unknown): QPayDeeplink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      return {
        name: typeof record.name === "string" ? record.name : "",
        description: typeof record.description === "string" ? record.description : "",
        logo: typeof record.logo === "string" ? record.logo : "",
        link: typeof record.link === "string" ? record.link : "",
      } satisfies QPayDeeplink;
    })
    .filter(
      (item): item is QPayDeeplink =>
        Boolean(item && item.name && item.description && item.logo && item.link),
    );
}

export function getPaidQPayRow(
  rows: QPayPaymentCheckRow[] | undefined,
  expectedAmount: number,
) {
  if (!rows?.length) {
    return null;
  }

  return (
    rows.find(
      (row) => row.payment_status === "PAID" && asNumber(row.payment_amount) >= expectedAmount,
    ) ?? rows[0]
  );
}

export async function createQPayInvoice(input: {
  amount: number;
  callbackUrl: string;
  description: string;
  invoiceReceiverCode: string;
  senderInvoiceNo: string;
}) {
  const { qpayBranchCode, qpayInvoiceCode, qpayStaffCode } = getQPayEnv();
  const payloadBody = {
    invoice_code: qpayInvoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.invoiceReceiverCode,
    invoice_description: input.description,
    amount: input.amount,
    callback_url: input.callbackUrl,
    allow_partial: false,
    allow_exceed: false,
    enable_expiry: false,
    ...(qpayBranchCode ? { sender_branch_code: qpayBranchCode } : {}),
    ...(qpayStaffCode ? { sender_staff_code: qpayStaffCode } : {}),
  };
  const payload = await qpayFetch<QPayInvoiceResponse>("/v2/invoice", {
    method: "POST",
    body: JSON.stringify(payloadBody),
  });

  return {
    invoiceId: payload.invoice_id,
    qrText: payload.qr_text,
    qrImage: payload.qr_image,
    shortUrl: payload.qPay_shortUrl ?? null,
    deeplinks: normalizeQPayDeeplinks(payload.qPay_deeplink),
  };
}

export async function getQPayPayment(paymentId: string) {
  return qpayFetch<QPayPaymentGetResponse>(`/v2/payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export async function checkQPayPayment(invoiceId: string) {
  return qpayFetch<QPayPaymentCheckResponse>("/v2/payment/check", {
    method: "POST",
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    }),
  });
}
