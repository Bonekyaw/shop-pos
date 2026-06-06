/** Single-tenant default until a Restaurant model exists. */
export function getDefaultRestaurantId(): string {
  return process.env.DEFAULT_RESTAURANT_ID ?? "default";
}
