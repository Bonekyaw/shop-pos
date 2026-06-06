import prisma from "@/lib/prisma";
import type { AuditAction, Prisma } from "@/app/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Snapshot the full order state (with items) for audit before/after comparison.
 * Works inside or outside a transaction.
 */
export async function snapshotOrder(
  orderId: string,
  client: TransactionClient | typeof prisma = prisma
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          menuItemId: true,
          quantity: true,
          price: true,
          status: true,
          notes: true,
          deliveredById: true
        }
      }
    }
  });

  if (!order) return null;

  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    tableId: order.tableId,
    items: order.items.map(i => ({
      id: i.id,
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      price: Number(i.price),
      status: i.status,
      notes: i.notes,
      deliveredById: i.deliveredById
    }))
  };
}

export type OrderSnapshot = NonNullable<Awaited<ReturnType<typeof snapshotOrder>>>;

/**
 * Write an audit log entry that captures before/after state.
 *
 * @param tx          Prisma transaction client (so the log is atomic with the mutation)
 * @param userId      The authenticated user performing the action
 * @param action      The AuditAction enum value
 * @param orderId     The order being mutated
 * @param before      Snapshot taken *before* the mutation (null for CREATE)
 * @param after       Snapshot taken *after* the mutation (null for DELETE)
 * @param extra       Any additional metadata to merge into `details`
 */
export async function writeAuditLog(
  tx: TransactionClient,
  userId: string,
  action: AuditAction,
  orderId: string,
  before: OrderSnapshot | null,
  after: OrderSnapshot | null,
  extra: Record<string, unknown> = {}
) {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      orderId,
      details: {
        before,
        after,
        ...extra
      }
    }
  });
}

export async function writeAdminAuditLog(
  tx: TransactionClient,
  userId: string,
  action: AuditAction,
  details: Prisma.InputJsonObject
) {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      orderId: null,
      details
    }
  });
}

/**
 * Convenience wrapper: snapshot → run mutation → snapshot → write log.
 * Use this to wrap any order-mutating logic inside a Prisma transaction.
 *
 * @returns The value returned by `mutationFn`.
 *
 * @example
 * ```ts
 * const result = await auditedOrderMutation(
 *   tx,
 *   session.user.id,
 *   "MODIFY_ORDER",
 *   orderId,
 *   async (tx) => {
 *     return tx.order.update({ ... });
 *   },
 *   { note: "Added 2 items" }
 * );
 * ```
 */
export async function auditedOrderMutation<T>(
  tx: TransactionClient,
  userId: string,
  action: AuditAction,
  orderId: string,
  mutationFn: (tx: TransactionClient) => Promise<T>,
  extra: Record<string, unknown> = {}
): Promise<T> {
  // Capture before state (null for new orders that don't exist yet)
  const before = await snapshotOrder(orderId, tx);

  // Execute the actual mutation
  const result = await mutationFn(tx);

  // Capture after state
  const after = await snapshotOrder(orderId, tx);

  // Write audit log with both states
  await writeAuditLog(tx, userId, action, orderId, before, after, extra);

  return result;
}
