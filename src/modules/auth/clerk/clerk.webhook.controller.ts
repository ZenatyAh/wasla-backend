import type { Request, Response } from "express";
import type { WebhookEvent } from "@clerk/backend/webhooks";
import { Webhook } from "svix";
import { CLERK_ENABLED, CLERK_WEBHOOK_SECRET } from "../../../common/utils/env.js";
import { handleClerkWebhookEvent } from "./clerk.webhook.service.js";

export const clerkWebhookController = async (req: Request, res: Response) => {
  if (!CLERK_ENABLED) {
    return res.status(503).json({ message: "Clerk webhooks are not configured" });
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ message: "Invalid webhook payload" });
  }

  const svixId = req.header("svix-id");
  const svixTimestamp = req.header("svix-timestamp");
  const svixSignature = req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ message: "Missing Svix headers" });
  }

  try {
    const webhook = new Webhook(CLERK_WEBHOOK_SECRET);
    const event = webhook.verify(req.body.toString("utf8"), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;

    await handleClerkWebhookEvent(event);

    return res.status(200).json({ received: true });
  } catch (err: unknown) {
    console.error("[webhooks/clerk] Verification or handler failed", {
      message: err instanceof Error ? err.message : err,
    });

    return res.status(400).json({ message: "Invalid webhook signature" });
  }
};
