'use server';

import { headers } from "next/headers";
import { whopsdk } from '@/lib/whop-sdk';
import type { Currency } from '@whop/sdk/resources/shared';

export async function createCheckoutConfiguration(companyId: string, price: number, bookId: string, currency: string) {
	try {
		const headersList = await headers();
		const { userId } = await whopsdk.verifyUserToken(headersList);
		
		console.log('[CREATE CHECKOUT] Creating checkout configuration for companyId:', companyId, 'price:', price, 'bookId:', bookId);
		
		const checkoutConfiguration = await whopsdk.checkoutConfigurations.create({
			plan: {
				company_id: companyId,
				initial_price: price,
				currency: currency.toLowerCase() as Currency,
				plan_type: "one_time",
			},
			metadata: {
				bookId: bookId,
				userId: userId,
			},
		});
		
		return checkoutConfiguration;
	} catch (error) {
		console.error('[CREATE CHECKOUT] Error:', error);
		throw new Error('Failed to create checkout configuration');
	}
}
