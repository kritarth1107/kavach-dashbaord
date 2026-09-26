/**
 * Family address book client. Contract: kavach-backend/docs/address-book-api.md.
 * Calls go through the dashboard's proxy routes under /api/families/:familyId/addresses.
 */

export type FamilyAddress = {
  addressId: string;
  nickname: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string;
  lat: number | null;
  lng: number | null;
  contactName: string | null;
  contactPhone: string | null;
  fullAddress: string;
  memberUserIds: string[];
  defaultForUserIds: string[];
  isDefaultForMember?: boolean;
  createdByUserId: string | null;
  source: "dashboard" | "whatsapp" | "migration";
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AddressInput = {
  nickname?: string;
  line1?: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string;
  contactName?: string | null;
  contactPhone?: string | null;
  memberUserIds?: string[];
  defaultForUserIds?: string[];
};

export class AddressApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json", ...(init.headers || {}) } : init.headers,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new AddressApiError("The request took too long. Please try again.", 504);
    throw new AddressApiError("Network error — check your connection.", 0);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: { success?: boolean; message?: string; data?: T } | null = null;
  try {
    json = text.trim() ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok || !json || json.success === false) {
    const fallback =
      res.status === 401
        ? "Your session expired. Please sign in again."
        : res.status === 403
          ? "Only caregivers of this family can change the address book."
          : res.status === 404
            ? "Not found — it may have been deleted."
            : `Request failed (${res.status})`;
    const generic = !json?.message || /^(Invalid|Empty) response/i.test(json.message);
    throw new AddressApiError(generic ? fallback : json!.message!, res.status);
  }
  return json.data;
}

const base = (familyId: string) => `/api/families/${encodeURIComponent(familyId)}/addresses`;

export async function listAddresses(familyId: string, memberUserId?: string): Promise<FamilyAddress[]> {
  const qs = memberUserId ? `?memberUserId=${encodeURIComponent(memberUserId)}` : "";
  const data = await request<{ addresses?: FamilyAddress[] }>(`${base(familyId)}${qs}`);
  return Array.isArray(data?.addresses) ? data!.addresses! : [];
}

export async function createAddress(familyId: string, input: AddressInput): Promise<FamilyAddress> {
  const data = await request<{ address: FamilyAddress }>(base(familyId), { method: "POST", body: JSON.stringify(input) });
  return data!.address;
}

export async function updateAddress(familyId: string, addressId: string, input: AddressInput): Promise<FamilyAddress> {
  const data = await request<{ address: FamilyAddress }>(`${base(familyId)}/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data!.address;
}

export async function deleteAddress(familyId: string, addressId: string): Promise<void> {
  await request(`${base(familyId)}/${encodeURIComponent(addressId)}`, { method: "DELETE" });
}

export async function setDefaultAddress(familyId: string, addressId: string, memberUserId: string): Promise<FamilyAddress> {
  const data = await request<{ address: FamilyAddress }>(`${base(familyId)}/${encodeURIComponent(addressId)}/default`, {
    method: "PUT",
    body: JSON.stringify({ memberUserId }),
  });
  return data!.address;
}
