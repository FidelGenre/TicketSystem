import { apiPost } from './api';

export type CheckoutPayload = {
  eventId: string;
  sectionId?: string;
  seatIds?: string[];
  quantity?: number;
  specialCode?: string;
  buyerEmail?: string;
  buyerName?: string;
};

export type CheckoutSession = {
  url: string;
  sessionId: string;
};

/** Creates a real Stripe Checkout session on the backend and returns its URL. */
export async function createCheckout(payload: CheckoutPayload): Promise<CheckoutSession> {
  return apiPost<CheckoutSession>('/orders/checkout', payload);
}
