"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@whop/react/components";
import { useIframeSdk } from "@whop/react";
import { createSubscriptionCheckout } from "@/app/action/subscription";

interface SubscriptionModalProps {
	isOpen: boolean;
	onClose: () => void;
	companyId: string;
	price?: number;
	currency?: string;
	onPurchaseSuccess?: () => void;
}

export default function SubscriptionModal({
	isOpen,
	onClose,
	companyId,
	price = 9.99,
	currency = "USD",
	onPurchaseSuccess,
}: SubscriptionModalProps) {
	const iframeSdk = useIframeSdk();
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasAttemptedPurchase, setHasAttemptedPurchase] = useState(false);

	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
		}).format(price);
	};

	// Reset state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setIsProcessing(false);
			setError(null);
			setHasAttemptedPurchase(false);
		}
	}, [isOpen]);

	const handlePurchase = async () => {
		if (isProcessing) return;

		setIsProcessing(true);
		setError(null);

		try {
			// Create subscription checkout configuration
			const checkoutConfiguration = await createSubscriptionCheckout(
				companyId,
				price,
				currency
			);

			// Open payment modal using iframe SDK
			const res = await iframeSdk.inAppPurchase({
				planId: checkoutConfiguration.plan.id,
				id: checkoutConfiguration.id,
			});

			if (res.status === "ok") {
				// Subscription purchase successful
				// The webhook will handle updating the subscription status
				if (onPurchaseSuccess) {
					onPurchaseSuccess();
				}
				onClose();
			} else {
				// Handle cancellation or error
				
					setError("Failed to complete subscription purchase");
					setIsProcessing(false);
				
			}
		} catch (err) {
			console.error("Subscription purchase error:", err);
			setError(err instanceof Error ? err.message : "Failed to start subscription purchase");
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md bg-gray-a2/90 dark:bg-gray-a1 backdrop-blur-xl border-gray-a5">
				<DialogHeader>
					<DialogTitle className="text-6 font-semibold text-gray-12 dark:text-gray-12">
						Subscribe to Add More Books
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="text-center">
						<p className="text-4 text-gray-11 dark:text-gray-11 mb-4">
							You've used your free book. Subscribe to add unlimited books to your bookshelf.
						</p>
						<div className="rounded-lg border border-gray-a4 bg-gray-a2/50 dark:bg-gray-a2 p-4 mb-4">
							<div className="flex items-center justify-between mb-3">
								<span className="text-5 font-semibold text-gray-12 dark:text-gray-12">Monthly Subscription</span>
								<span className="text-5 font-bold text-gray-12 dark:text-gray-12">
									{formatPrice(price, currency)}
									<span className="text-3 text-gray-11 dark:text-gray-11 font-normal">/month</span>
								</span>
							</div>
							<ul className="space-y-2 text-left">
								<li className="flex items-start gap-2">
									<svg className="h-4 w-4 text-green-11 dark:text-green-11 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
									<span className="text-3 text-gray-12 dark:text-gray-12">Unlimited books</span>
								</li>
								<li className="flex items-start gap-2">
									<svg className="h-4 w-4 text-green-11 dark:text-green-11 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
									<span className="text-3 text-gray-12 dark:text-gray-12">Cancel anytime</span>
								</li>
								<li className="flex items-start gap-2">
									<svg className="h-4 w-4 text-green-11 dark:text-green-11 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
									<span className="text-3 text-gray-12 dark:text-gray-12">All premium features</span>
								</li>
							</ul>
						</div>
					</div>

					{isProcessing ? (
						<div className="mb-4">
							<div className="flex items-center justify-center gap-2">
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-12 dark:border-gray-12"></div>
								<p className="text-4 text-gray-11 dark:text-gray-10">
									Opening checkout to subscribe...
								</p>
							</div>
						</div>
					) : null}

					{error && (
						<div className="rounded-lg border border-red-a4 bg-red-a2 p-3 mb-4">
							<p className="text-sm text-red-11">{error}</p>
						</div>
					)}

					<div className="flex gap-3">
						<Button
							variant="ghost"
							size="4"
							onClick={onClose}
							disabled={isProcessing}
							className="flex-1"
							style={{
								backgroundColor: '#f3f4f6',
								border: '1px solid #e5e7eb',
								color: '#111827',
							}}
						>
							Cancel
						</Button>
						<Button
							variant="classic"
							size="4"
							onClick={handlePurchase}
							disabled={isProcessing}
							className="flex-1"
							style={{
								backgroundColor: '#2563eb',
								border: 'none',
								color: '#ffffff',
							}}
							onMouseEnter={(e) => {
								if (!isProcessing) {
									e.currentTarget.style.backgroundColor = '#1d4ed8';
								}
							}}
							onMouseLeave={(e) => {
								if (!isProcessing) {
									e.currentTarget.style.backgroundColor = '#2563eb';
								}
							}}
						>
							{isProcessing ? "Processing..." : "Subscribe"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

