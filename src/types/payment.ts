export type PaymentStatus =
  | 'REVIEW_REQUIRED'
  | 'AUTHENTICATION_REQUIRED'
  | 'CONFIRMATION_REQUIRED'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentIntentPayload {
  intent: string;
  amount: number;
  currency: string;
  recipient_name: string;
  raw_transcript: string;
}

export interface PaymentIntentResponse {
  transaction_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  recipient_name: string;
  message: string;
  requires_auth: boolean;
  created_at: string;
}

export interface AuthVerificationPayload {
  transaction_id: string;
  auth_method?: string;
  auth_success: boolean;
}

export interface PaymentConfirmationPayload {
  transaction_id: string;
  explicit_confirmation: boolean;
}

export interface PaymentActionResponse {
  transaction_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  recipient_name: string;
  message: string;
  completed_at?: string | null;
}
