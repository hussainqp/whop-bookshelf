import { waitUntil } from "@vercel/functions";
import type { Payment } from "@whop/sdk/resources.js";
import type { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { grantBookAccess } from "@/app/action/books";
import { updateSubscriptionStatus } from "@/app/action/subscription";

export async function POST(request: NextRequest): Promise<Response> {
	// Validate the webhook to ensure it's from Whop
	console.log("[WEBHOOK RECEIVED]", request);
	const requestBodyText = await request.text();
	const headers = Object.fromEntries(request.headers);
	const webhookData = JSON.parse(requestBodyText) as UnwrapWebhookEvent;
	// const webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });

	// Handle the webhook event
	if (webhookData.type === "payment.succeeded") {
		waitUntil(handlePaymentSucceeded(webhookData.data));
	} else if (webhookData.type === "membership.activated") {
		waitUntil(handleMembershipActivated(webhookData.data));
	} else if (webhookData.type === "membership.deactivated") {
		waitUntil(handleMembershipDeactivated(webhookData.data));
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

// Handle membership activated - subscription created or renewed
async function handleMembershipActivated(membership: any) {
	try {
		console.log("[MEMBERSHIP ACTIVATED]", membership);

		// Extract company ID from membership data
		const companyId = membership.company?.id;
		if (!companyId) {
			console.error("[MEMBERSHIP ACTIVATED] Missing company.id in membership data");
			return;
		}

		// Check if this is a subscription membership by checking metadata
		// We only want to process subscriptions, not book purchases
		const metadata = membership.metadata || {};
		const membershipType = metadata.type;
		
		// Only process if it's a subscription (or if metadata doesn't specify, assume it's a subscription for our app)
		// Book purchases won't have type="subscription" in metadata
		if (membershipType && membershipType !== "subscription") {
			console.log("[MEMBERSHIP ACTIVATED] Not a subscription membership, skipping", { membershipType });
			return;
		}

		// Extract subscription details
		const subscriptionId = membership.id; // Membership ID serves as subscription ID
		const planId = membership.plan?.id;
		const renewalPeriodStart = membership.renewal_period_start;
		const renewalPeriodEnd = membership.renewal_period_end;

		// Update subscription status
		await updateSubscriptionStatus({
			companyId,
			subscriptionStatus: 'active',
			subscriptionPlanId: planId,
			subscriptionId: subscriptionId,
			subscriptionStartedAt: renewalPeriodStart || membership.created_at || new Date().toISOString(),
			subscriptionExpiresAt: renewalPeriodEnd || (() => {
				// Fallback: calculate 30 days from now if renewal_period_end is not available
				const expiresAt = new Date();
				expiresAt.setMonth(expiresAt.getMonth() + 1);
				return expiresAt.toISOString();
			})(),
		});

		console.log("[MEMBERSHIP ACTIVATED] Subscription activated", {
			companyId,
			subscriptionId,
			planId,
			expiresAt: renewalPeriodEnd,
		});
	} catch (error) {
		console.error("[MEMBERSHIP ACTIVATED] Error processing membership webhook:", error);
	}
}

// Handle membership deactivated - subscription cancelled or expired
async function handleMembershipDeactivated(membership: any) {
	try {
		console.log("[MEMBERSHIP DEACTIVATED]", membership);

		// Extract company ID from membership data
		const companyId = membership.company?.id;
		if (!companyId) {
			console.error("[MEMBERSHIP DEACTIVATED] Missing company.id in membership data");
			return;
		}

		// Check if this is a subscription membership
		const metadata = membership.metadata || {};
		const membershipType = metadata.type;
		
		if (membershipType && membershipType !== "subscription") {
			console.log("[MEMBERSHIP DEACTIVATED] Not a subscription membership, skipping", { membershipType });
			return;
		}

		// Determine if cancelled or expired
		// If cancel_at_period_end is true, keep active until renewal_period_end
		// Otherwise, mark as cancelled/expired immediately
		const cancelAtPeriodEnd = membership.cancel_at_period_end;
		const renewalPeriodEnd = membership.renewal_period_end;
		const now = new Date();

		if (cancelAtPeriodEnd && renewalPeriodEnd && new Date(renewalPeriodEnd) > now) {
			// Cancelled but still active until period end
			await updateSubscriptionStatus({
				companyId,
				subscriptionStatus: 'cancelled', // Mark as cancelled but keep expiry date
				subscriptionExpiresAt: renewalPeriodEnd,
			});
			console.log("[MEMBERSHIP DEACTIVATED] Subscription cancelled (active until period end)", {
				companyId,
				expiresAt: renewalPeriodEnd,
			});
		} else {
			// Fully deactivated/expired
			await updateSubscriptionStatus({
				companyId,
				subscriptionStatus: 'expired',
			});
			console.log("[MEMBERSHIP DEACTIVATED] Subscription expired", { companyId });
		}
	} catch (error) {
		console.error("[MEMBERSHIP DEACTIVATED] Error processing membership webhook:", error);
	}
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
