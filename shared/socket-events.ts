/**
 * Shared Socket.io event contracts for pos-admin and pos-app (strict).
 * Server → client payloads use discriminated unions by `type`.
 */

export const ServerEventType = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ITEM_DELIVERED: "ITEM_DELIVERED",
  ORDER_READY: "ORDER_READY",
  PAYMENT_REQUESTED: "PAYMENT_REQUESTED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
} as const;

export type ServerEventTypeName =
  (typeof ServerEventType)[keyof typeof ServerEventType];

/** Base fields present on every server-emitted event. */
export type ServerEventBase = {
  restaurantId: string;
  timestamp: string;
};

export type OrderCreatedPayload = ServerEventBase & {
  type: typeof ServerEventType.ORDER_CREATED;
  orderId: string;
  tableId: string | null;
};

export type OrderUpdatedPayload = ServerEventBase & {
  type: typeof ServerEventType.ORDER_UPDATED;
  orderId: string;
};

export type ItemDeliveredPayload = ServerEventBase & {
  type: typeof ServerEventType.ITEM_DELIVERED;
  orderId: string;
  orderItemId: string;
};

export type OrderReadyPayload = ServerEventBase & {
  type: typeof ServerEventType.ORDER_READY;
  orderId: string;
};

export type PaymentRequestedPayload = ServerEventBase & {
  type: typeof ServerEventType.PAYMENT_REQUESTED;
  orderId: string;
  paymentId: string;
};

export type PaymentConfirmedPayload = ServerEventBase & {
  type: typeof ServerEventType.PAYMENT_CONFIRMED;
  orderId: string;
  paymentId: string;
};

/** Union of all payloads the server may emit on `event`. */
export type ServerEventPayload =
  | OrderCreatedPayload
  | OrderUpdatedPayload
  | ItemDeliveredPayload
  | OrderReadyPayload
  | PaymentRequestedPayload
  | PaymentConfirmedPayload;

/**
 * Server → client: single channel name carrying typed payloads.
 * Clients should narrow on `payload.type`.
 */
export const SERVER_EVENT_CHANNEL = "pos:event" as const;

/** Client → server: subscribe to a table room. */
export type SubscribeTablePayload = {
  tableId: string;
};

/** Typed Socket.io server → client events map (Socket.io v4 style). */
export type ServerToClientEvents = {
  [SERVER_EVENT_CHANNEL]: (payload: ServerEventPayload) => void;
};

/**
 * Client → server: optional control events after JWT auth.
 * Keys use string literals for Socket.io compatibility.
 */
export interface ClientToServerEvents {
  "subscribe:table": (payload: SubscribeTablePayload) => void;
  "subscribe:kitchen": () => void;
  "unsubscribe:table": (payload: SubscribeTablePayload) => void;
}
