import { waitUntil } from "@vercel/functions";
import type { Payment, UnwrapWebhookEvent } from "@whop/sdk/resources.js";
import type { NextRequest } from "next/server";
import { whopsdkApp } from "@/lib/whop-sdk";
import { grantBookAccess } from "@/app/action/books";
import { updateSubscriptionStatus } from "@/app/action/subscription";

export async function POST(request: NextRequest): Promise<Response> {
	// Validate the webhook to ensure it's from Whop
	console.log("[WEBHOOK RECEIVED]", request);
	const requestBodyText = await request.text();
	const headers = Object.fromEntries(request.headers);
	// const webhookData = JSON.parse(requestBodyText);
	const webhookData = whopsdkApp.webhooks.unwrap(requestBodyText, { headers });
	console.log("[WEBHOOK DATA]", webhookData);
	// Handle the webhook event
	if (webhookData.type === "payment.succeeded") {
		waitUntil(handlePaymentSucceeded(webhookData.data));
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

// Handle payment succeeded - only for book purchases (not subscriptions)
async function handlePaymentSucceeded(payment: Payment) {
	try {
		console.log("[PAYMENT SUCCEEDED]", payment);

		// Extract metadata from payment (Payment type may not include metadata in type definition)
		const paymentWithMetadata = payment as Payment & { metadata?: Record<string, string> };
		const metadata = paymentWithMetadata.metadata;
		
		if (!metadata) {
			console.error("[PAYMENT SUCCEEDED] No metadata found in payment");
			return;
		}

		// Only process book purchases (subscriptions are handled by membership.activated)
		const paymentType = metadata.type;
		if (paymentType === "subscription") {
			console.log("[PAYMENT SUCCEEDED] Subscription payment - handled by membership.activated webhook, skipping");
			return;
		}

		// This is a book purchase
		const bookId = metadata.bookId;
		const userId = metadata.userId;

		if (!bookId || !userId) {
			console.error("[PAYMENT SUCCEEDED] Missing bookId or userId in metadata", { bookId, userId });
			return;
		}

		// Extract price and currency from payment
		const pricePaid = payment.total ? Number(payment.total) : undefined;
		const currencyPaid = payment.currency || undefined;

		// Grant access to the book
		const result = await grantBookAccess({
			bookId,
			userId,
			pricePaid,
			currencyPaid,
		});

		if (result.success) {
			console.log("[PAYMENT SUCCEEDED] Access granted successfully", {
				bookId,
				userId,
				alreadyHadAccess: result.alreadyHadAccess,
			});
		} else {
			console.error("[PAYMENT SUCCEEDED] Failed to grant access", { bookId, userId });
		}
	} catch (error) {
		console.error("[PAYMENT SUCCEEDED] Error processing payment webhook:", error);
		// Don't throw - we've already returned 200, and we don't want to retry
	}
}
