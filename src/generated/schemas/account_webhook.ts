/**
 * This file was manually added to mirror generated webhook account schemas.
 * Regenerate schemas when the generator supports account-webhooks.
 */

import { z } from 'zod';

const accountWebhookEvents = z.enum([
  "white_label_subscription.subscribed",
  "white_label_subscription.upgraded",
  "white_label_subscription.downgrade_scheduled",
  "white_label_subscription.downgraded",
  "white_label_subscription.cancellation_scheduled",
  "white_label_subscription.cancelled",
  "white_label_subscription.renewed",
  "white_label_subscription.expired",
  "white_label_subscription.payment_failed",
]);

const createAccountWebhookSchemaDefinition = z.object({
  url: z.string().max(2048).url(),
  description: z.string().max(500).optional(),
  events: z.array(accountWebhookEvents).min(1),
  active: z.boolean().optional().default(true),
  metadata: z.union([z.record(z.string(), z.any()), z.null()]).optional(),
});

export type CreateAccountWebhookSchema = z.infer<typeof createAccountWebhookSchemaDefinition>;

const updateAccountWebhookSchemaDefinition = z
  .object({
    url: z.string().max(2048).url(),
    description: z.union([z.string().max(500), z.null()]),
    events: z.array(accountWebhookEvents).min(1),
    active: z.boolean(),
    metadata: z.union([z.record(z.string(), z.any()), z.null()]),
  })
  .partial();

export type UpdateAccountWebhookSchema = z.infer<typeof updateAccountWebhookSchemaDefinition>;

export const createAccountWebhookSchema = createAccountWebhookSchemaDefinition;
export const updateAccountWebhookSchema = updateAccountWebhookSchemaDefinition;
