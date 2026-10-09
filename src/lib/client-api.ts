export class ClientApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ClientApiError";
  }
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const data = await response.json().catch(() => null) as { error?: { message?: string; details?: { message?: string }[] } } | null;
  if (!response.ok) {
    const message = data?.error?.details?.[0]?.message ?? data?.error?.message ?? "The request could not be completed.";
    throw new ClientApiError(message, response.status);
  }
  return data as T;
}