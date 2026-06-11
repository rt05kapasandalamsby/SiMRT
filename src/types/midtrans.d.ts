/**
 * TypeScript declarations for Midtrans Snap.js
 * Loaded from: https://app.sandbox.midtrans.com/snap/snap.js
 */

interface MidtransSnapResult {
  status_code:          string;
  status_message:       string;
  transaction_id:       string;
  order_id:             string;
  gross_amount:         string;
  payment_type:         string;
  transaction_time:     string;
  transaction_status:   string;
  fraud_status?:        string;
  payment_code?:        string;
  va_numbers?:          { bank: string; va_number: string }[];
  pdf_url?:             string;
  finish_redirect_url?: string;
}

interface MidtransSnapOptions {
  onSuccess?:   (result: MidtransSnapResult) => void;
  onPending?:   (result: MidtransSnapResult) => void;
  onError?:     (result: MidtransSnapResult) => void;
  onClose?:     () => void;
  language?:    "id" | "en";
  autoCloseDelay?: number;
}

interface MidtransSnap {
  pay:  (snapToken: string, options?: MidtransSnapOptions) => void;
  hide: () => void;
  show: () => void;
}

declare global {
  interface Window {
    snap: MidtransSnap;
  }
}

export {};
