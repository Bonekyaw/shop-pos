import {
  SERVER_EVENT_CHANNEL,
  type ServerEventPayload,
} from "@shared/socket-events";
import { getIO } from "./socket-handler";

function roomRestaurant(restaurantId: string): string {
  return `restaurant:${restaurantId}`;
}

function roomTable(tableId: string): string {
  return `table:${tableId}`;
}

/** Emit a typed event to everyone in `restaurant:{id}`. */
export function emitToRestaurant(
  restaurantId: string,
  payload: ServerEventPayload,
): void {
  getIO()?.to(roomRestaurant(restaurantId)).emit(SERVER_EVENT_CHANNEL, payload);
}

/** Emit to a single table room. */
export function emitToTable(
  tableId: string,
  payload: ServerEventPayload,
): void {
  getIO()?.to(roomTable(tableId)).emit(SERVER_EVENT_CHANNEL, payload);
}

/** Kitchen display (ADMIN subscribers only). */
export function emitToKitchen(payload: ServerEventPayload): void {
  getIO()?.to("kitchen").emit(SERVER_EVENT_CHANNEL, payload);
}
