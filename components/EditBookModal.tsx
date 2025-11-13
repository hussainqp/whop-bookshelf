"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@whop/react/components";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateBook } from "@/app/action/books";

interface Book {
	id: string;
	title: string;
	subtitle?: string;
	description?: string;
	isBehindPaywall?: boolean;
	price?: number;
	currency?: string;
}

interface EditBookModalProps {
	isOpen: boolean;
	onClose: () => void;
	book: Book | null;
	companyId: string;
	onSuccess?: () => void;
}

const CURRENCIES = [
	{ value: "USD", label: "USD ($)" },
	{ value: "EUR", label: "EUR (€)" },
	{ value: "GBP", label: "GBP (£)" },
	{ value: "INR", label: "INR (₹)" },
	{ value: "JPY", label: "JPY (¥)" },
	{ value: "CAD", label: "CAD (C$)" },
	{ value: "AUD", label: "AUD (A$)" },
	{ value: "SGD", label: "SGD (S$)" },
];

export default function EditBookModal({
	isOpen,
	onClose,
	book,
	companyId,
	onSuccess,
}: EditBookModalProps) {
	const [isSubmitting, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [formData, setFormData] = useState({
		title: book?.title || "",
		subtitle: book?.subtitle || "",
		description: book?.description || "",
		isBehindPaywall: book?.isBehindPaywall || false,
		price: book?.price?.toString() || "",
		currency: book?.currency || "USD",
	});

	// Update form data when book changes
	useEffect(() => {
		if (book) {
			setFormData({
				title: book.title || "",
				subtitle: book.subtitle || "",
				description: book.description || "",
				isBehindPaywall: book.isBehindPaywall || false,
				price: book.price?.toString() || "",
				currency: book.currency || "USD",
			});
			setError(null);
			setSuccess(false);
		}
	}, [book]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		if (!book) return;

		if (!formData.title.trim()) {
			setError("Title is required");
			return;
		}

		if (formData.isBehindPaywall) {
			if (!formData.price || parseFloat(formData.price) <= 0) {
				setError("Please enter a valid price");
				return;
			}
			if (!formData.currency) {
				setError("Please select a currency");
				return;
			}
		}

		startTransition(async () => {
			try {
				const result = await updateBook({
					bookId: book.id,
					companyId,
					title: formData.title.trim() || undefined,
					subtitle: formData.subtitle.trim() || undefined,
					description: formData.description.trim() || undefined,
					isBehindPaywall: formData.isBehindPaywall,
					price: formData.isBehindPaywall && formData.price ? parseFloat(formData.price) : undefined,
					currency: formData.isBehindPaywall && formData.currency ? formData.currency : undefined,
				});

				if (result.success) {
					setSuccess(true);
					setTimeout(() => {
						if (onSuccess) {
							onSuccess();
						}
						onClose();
					}, 1000);
				}
			} catch (err) {
				console.error("Error updating book:", err);
				setError(err instanceof Error ? err.message : "Failed to update book");
			}
		});
	};

	if (!book) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl bg-gray-a1 border-gray-a5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'rgba(249, 250, 251, 0.95)', backdropFilter: 'blur(12px)' }}>
				<DialogHeader>
					<DialogTitle className="text-6 font-semibold text-gray-12">
						Edit Book
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-6 py-4">
					{/* Title */}
					<div>
						<Label htmlFor="edit-title" className="text-4 text-gray-11 mb-2 block">
							Title <span className="text-red-11">*</span>
						</Label>
						<Input
							id="edit-title"
							type="text"
							value={formData.title}
							onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
							required
							className="bg-gray-a2 border-gray-a4"
						/>
					</div>

					{/* Subtitle */}
					<div>
						<Label htmlFor="edit-subtitle" className="text-4 text-gray-11 mb-2 block">
							Subtitle
						</Label>
						<Input
							id="edit-subtitle"
							type="text"
							value={formData.subtitle}
							onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
							className="bg-gray-a2 border-gray-a4"
						/>
					</div>

					{/* Description */}
					<div>
						<Label htmlFor="edit-description" className="text-4 text-gray-11 mb-2 block">
							Description
						</Label>
						<Textarea
							id="edit-description"
							value={formData.description}
							onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
							rows={4}
							className="bg-gray-a2 border-gray-a4"
						/>
					</div>

					{/* Behind Paywall Toggle */}
					<div className="flex items-center gap-3">
						<input
							type="checkbox"
							id="edit-behind-paywall"
							checked={formData.isBehindPaywall}
							onChange={(e) => setFormData((prev) => ({ ...prev, isBehindPaywall: e.target.checked }))}
							className="h-4 w-4 rounded border-gray-a4"
						/>
						<Label htmlFor="edit-behind-paywall" className="text-4 text-gray-11 cursor-pointer">
							Behind Paywall
						</Label>
					</div>

					{/* Price and Currency (shown when paywall is enabled) */}
					{formData.isBehindPaywall && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="edit-price" className="text-4 text-gray-11 mb-2 block">
									Price <span className="text-red-11">*</span>
								</Label>
								<Input
									id="edit-price"
									type="number"
									step="0.01"
									min="0"
									value={formData.price}
									onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
									required
									className="bg-gray-a2 border-gray-a4"
								/>
							</div>
							<div>
								<Label htmlFor="edit-currency" className="text-4 text-gray-11 mb-2 block">
									Currency <span className="text-red-11">*</span>
								</Label>
								<select
									id="edit-currency"
									value={formData.currency}
									onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
									required
									className="flex h-10 w-full rounded-md border border-gray-a4 bg-gray-a2 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-a8 focus-visible:ring-offset-2"
								>
									{CURRENCIES.map((curr) => (
										<option key={curr.value} value={curr.value}>
											{curr.label}
										</option>
									))}
								</select>
							</div>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="rounded-lg border border-red-a4 bg-red-a2 p-3">
							<p className="text-sm text-red-11">{error}</p>
						</div>
					)}

					{/* Success Message */}
					{success && (
						<div className="rounded-lg border border-green-a4 bg-green-a2 p-3">
							<p className="text-sm text-green-11">Book updated successfully!</p>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-3 justify-end">
						<Button
							type="button"
							variant="ghost"
							size="5"
							onClick={onClose}
							disabled={isSubmitting}
							style={{
								backgroundColor: '#f3f4f6',
								border: '1px solid #e5e7eb',
								color: '#111827',
								padding: '0.75rem 1.5rem',
								fontSize: '0.9375rem',
								fontWeight: '500',
							}}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="classic"
							size="5"
							disabled={isSubmitting}
							style={{
								backgroundColor: '#2563eb',
								border: 'none',
								color: '#ffffff',
								padding: '0.75rem 1.5rem',
								fontSize: '0.9375rem',
								fontWeight: '500',
							}}
							onMouseEnter={(e) => {
								if (!isSubmitting) {
									e.currentTarget.style.backgroundColor = '#1d4ed8';
								}
							}}
							onMouseLeave={(e) => {
								if (!isSubmitting) {
									e.currentTarget.style.backgroundColor = '#2563eb';
								}
							}}
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

