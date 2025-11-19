"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@whop/react/components";
import { useIframeSdk } from "@whop/react";
import { createCheckoutConfiguration } from "@/app/action/credit";
import { grantBookAccess } from "@/app/action/books";

interface PaywallModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookTitle: string;
	bookId: string;
	companyId: string;
	price?: number;
	currency?: string;
	onPurchaseSuccess?: () => void;
}

export default function PaywallModal({
	isOpen,
	onClose,
	bookTitle,
	bookId,
	companyId,
	price,
	currency = "USD",
	onPurchaseSuccess,
}: PaywallModalProps) {
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

	// Automatically trigger purchase when modal opens
	useEffect(() => {
		if (isOpen && !hasAttemptedPurchase && price) {
			setHasAttemptedPurchase(true);
			// Trigger purchase automatically
			handlePurchase().catch((err) => {
				console.error("Auto-purchase error:", err);
			});
		}
		// Reset when modal closes
		if (!isOpen) {
			setHasAttemptedPurchase(false);
			setError(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, hasAttemptedPurchase, price]);

	async function handlePurchase() {
		if (!price) {
			setError("Price is required");
			return;
		}

		setIsProcessing(true);
		setError(null);

		try {
			// 1. Create checkout configuration on server
			const checkoutConfiguration = await createCheckoutConfiguration(
				companyId,
				price,
				bookId,
				currency as any
			);

			// 2. Open payment modal
			const res = await iframeSdk.inAppPurchase({
				planId: checkoutConfiguration.plan.id,
				id: checkoutConfiguration.id,
			});

			if (res.status === "ok") {
				// 3. Grant access after successful purchase
				try {
					await grantBookAccess({
						bookId,
						pricePaid: price,
						currencyPaid: currency,
					});

					// Call success callback to refresh access and open book
					if (onPurchaseSuccess) {
						onPurchaseSuccess();
					} else {
						onClose();
					}
				} catch (grantError) {
					console.error("Error granting access:", grantError);
					setError("Purchase successful but failed to grant access. Please contact support.");
				}
			} else {
				// Handle payment errors
				setError(res.error || "Payment failed. Please try again.");
			}
		} catch (err) {
			console.error("Error during purchase:", err);
			setError(err instanceof Error ? err.message : "Failed to process purchase");
		} finally {
			setIsProcessing(false);
		}
	}
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md bg-gray-a2/90 dark:bg-gray-a1 backdrop-blur-xl border-gray-a5">
				<DialogHeader>
					<DialogTitle className="text-6 font-semibold text-gray-12 dark:text-gray-12">
						Premium Content
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-a3 dark:bg-gray-a3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-8 w-8 text-gray-11 dark:text-gray-10"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
								/>
							</svg>
						</div>
						<h3 className="text-5 font-semibold text-gray-12 dark:text-gray-12 mb-2">
							"{bookTitle}" is behind a paywall
						</h3>
						{price && (
							<div className="mb-4">
								<p className="text-6 font-bold text-gray-12 dark:text-gray-12">
									{formatPrice(price, currency)}
								</p>
							</div>
						)}
						{isProcessing ? (
							<div className="mb-6">
								<div className="flex items-center justify-center gap-2">
									<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-12 dark:border-gray-12"></div>
									<p className="text-4 text-gray-11 dark:text-gray-10">
										Opening checkout...
									</p>
								</div>
							</div>
						) : !error ? (
							<p className="text-4 text-gray-11 dark:text-gray-10 mb-6">
								Opening checkout to purchase access...
							</p>
						) : null}
					</div>
					{error && (
						<div className="rounded-lg border border-red-a4 bg-red-a2 p-3 mb-4">
							<p className="text-sm text-red-11">{error}</p>
						</div>
					)}
					{error && (
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
								disabled={isProcessing || !price}
								className="flex-1"
								style={{
									backgroundColor: '#2563eb',
									border: 'none',
									color: '#ffffff',
								}}
								onMouseEnter={(e) => {
									if (!isProcessing && price) {
										e.currentTarget.style.backgroundColor = '#1d4ed8';
									}
								}}
								onMouseLeave={(e) => {
									if (!isProcessing && price) {
										e.currentTarget.style.backgroundColor = '#2563eb';
									}
								}}
							>
								{isProcessing ? "Processing..." : "Retry Purchase"}
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

