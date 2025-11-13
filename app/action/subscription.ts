'use server';

import { headers } from "next/headers";
import { cache } from "react";
import { whopsdk } from '@/lib/whop-sdk';
import { verifyUser } from "@/app/action/authentication";
import { getCompanyDataFromDB } from "@/app/action/company";
import db from "@/lib/db";
import { merchants, flipbooks } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import type { Currency } from '@whop/sdk/resources/shared';

// Check subscription status for a company
export const checkSubscriptionStatus = cache(async (companyId: string) => {
	try {
		await verifyUser(companyId);
		
		const merchant = await getCompanyDataFromDB(companyId);
		if (!merchant) {
			return {
				hasActiveSubscription: false,
				canAddBook: false,
				freeBookAvailable: false,
				bookCount: 0,
				subscriptionStatus: 'free' as const,
				subscriptionExpiresAt: null,
			} as const;
		}
		
		// Count existing books
		const [bookCountResult] = await db
			.select({ count: count() })
			.from(flipbooks)
			.where(eq(flipbooks.companyId, companyId));
		
		const bookCount = bookCountResult?.count || 0;
		
		// Check subscription status
		const subscriptionStatus = (merchant.subscriptionStatus as 'free' | 'active' | 'cancelled' | 'expired') || 'free';
		const subscriptionExpiresAt = merchant.subscriptionExpiresAt;
		const freeBookUsed = merchant.freeBookUsed || false;
		
		// Check if subscription is active
		const now = new Date();
		const hasActiveSubscription = 
			subscriptionStatus === 'active' && 
			subscriptionExpiresAt && 
			new Date(subscriptionExpiresAt) > now;
		
		// Check if free book is available
		const freeBookAvailable = !freeBookUsed && bookCount === 0;
		
		// Check if can add book
		const canAddBook = freeBookAvailable || hasActiveSubscription;
		
		return {
			hasActiveSubscription,
			canAddBook,
			freeBookAvailable,
			bookCount,
			subscriptionStatus,
			subscriptionExpiresAt,
		} as const;
	} catch (err: unknown) {
		console.error('[CHECK SUBSCRIPTION STATUS] Error:', err);
		throw new Error("Failed to check subscription status");
	}
});

// Check if company can create a book
export async function checkCanCreateBook(companyId: string) {
	try {
		const status = await checkSubscriptionStatus(companyId);
		
		if (status.canAddBook) {
			return {
				canCreate: true,
				reason: null,
				requiresSubscription: false,
			} as const;
		}
		
		// Determine reason
		let reason = "You need an active subscription to add more books.";
		let requiresSubscription = true;
		
		if (status.bookCount === 0 && !status.freeBookAvailable) {
			reason = "Your free book has already been used. Please subscribe to add more books.";
		} else if (status.bookCount > 0 && !status.hasActiveSubscription) {
			reason = "You've used your free book. Please subscribe to add more books.";
		}
		
		return {
			canCreate: false,
			reason,
			requiresSubscription,
		} as const;
	} catch (err: unknown) {
		console.error('[CHECK CAN CREATE BOOK] Error:', err);
		throw new Error("Failed to check if book can be created");
	}
};

// Create subscription checkout configuration
export async function createSubscriptionCheckout(
	companyId: string,
	price: number = 1,
	currency: string = "INR"
) {
	try {
		const headersList = await headers();
		const { userId } = await whopsdk.verifyUserToken(headersList);
		
		await verifyUser(companyId);
		
		console.log('[CREATE SUBSCRIPTION CHECKOUT] Creating subscription for companyId:', companyId, 'price:', price, 'currency:', currency);
		
		// Create a recurring monthly subscription plan
		const checkoutConfiguration = await whopsdk.checkoutConfigurations.create({
			// plan: {
			// 	company_id: companyId,
			// 	currency: currency.toLowerCase() as Currency,
			// 	plan_type: "renewal",
			// 	billing_period: 30,
			// 	product_id: "prod_3i3cfankxb2uI",
			// 	renewal_price: price, // Monthly subscription
			// },
			plan_id: "plan_8ezHAwYoKKNSn",
			metadata: {
				companyId: companyId,
				userId: userId,
				type: "subscription", // Mark this as a subscription purchase
				isFirstPayment: "true", // Mark this as the first payment
			},
		});
		
		return checkoutConfiguration;
	} catch (error) {
		console.error('[CREATE SUBSCRIPTION CHECKOUT] Error:', error);
		throw new Error('Failed to create subscription checkout configuration');
	}
}

// Update subscription status in database
export async function updateSubscriptionStatus({
	companyId,
	subscriptionStatus,
	subscriptionPlanId,
	subscriptionId,
	subscriptionStartedAt,
	subscriptionExpiresAt,
}: {
	companyId: string;
	subscriptionStatus: 'free' | 'active' | 'cancelled' | 'expired';
	subscriptionPlanId?: string;
	subscriptionId?: string;
	subscriptionStartedAt?: string;
	subscriptionExpiresAt?: string;
}) {
	try {
		// Build update object
		const updateData: Record<string, any> = {
			subscriptionStatus,
		};
		
		if (subscriptionPlanId !== undefined) updateData.subscriptionPlanId = subscriptionPlanId;
		if (subscriptionId !== undefined) updateData.subscriptionId = subscriptionId;
		if (subscriptionStartedAt !== undefined) updateData.subscriptionStartedAt = subscriptionStartedAt;
		if (subscriptionExpiresAt !== undefined) updateData.subscriptionExpiresAt = subscriptionExpiresAt;
		
		await db
			.update(merchants)
			.set(updateData)
			.where(eq(merchants.companyId, companyId));
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[UPDATE SUBSCRIPTION STATUS] Error:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to update subscription status: ${err.message}`);
		}
		throw new Error("Failed to update subscription status");
	}
}

// Mark free book as used
export async function markFreeBookUsed(companyId: string) {
	try {
		await db
			.update(merchants)
			.set({ freeBookUsed: true })
			.where(eq(merchants.companyId, companyId));
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[MARK FREE BOOK USED] Error:', err);
		throw new Error("Failed to mark free book as used");
	}
}

// Reset free book status (when all books are deleted)
export async function resetFreeBookUsed(companyId: string) {
	try {
		await db
			.update(merchants)
			.set({ freeBookUsed: false })
			.where(eq(merchants.companyId, companyId));
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[RESET FREE BOOK USED] Error:', err);
		throw new Error("Failed to reset free book status");
	}
}

