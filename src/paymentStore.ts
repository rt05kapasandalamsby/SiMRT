/**
 * paymentStore — DEPRECATED
 * Payment state is now managed directly in Firestore via Iuran.tsx and WargaIuran.tsx
 */

export function loadAllPayments(): Record<string, string> {
  return {};
}

export function savePayment(_iuranId: number, _status: string): void {
  // No-op — payments tracked in Firestore
}
