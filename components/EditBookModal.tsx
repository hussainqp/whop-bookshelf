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
{ value: "SGD", label: "SGD (S$)" },
{ value: "INR", label: "INR (₹)" },
{ value: "AUD", label: "AUD (A$)" },
{ value: "BRL", label: "BRL (R$)" },
{ value: "CAD", label: "CAD (C$)" },
{ value: "DKK", label: "DKK (kr)" },
{ value: "EUR", label: "EUR (€)" },
{ value: "NOK", label: "NOK (kr)" },
{ value: "GBP", label: "GBP (£)" },
{ value: "SEK", label: "SEK (kr)" },
{ value: "CHF", label: "CHF (CHF)" },
{ value: "HKD", label: "HKD (HK$)" },
{ value: "HUF", label: "HUF (Ft)" },
{ value: "JPY", label: "JPY (¥)" },
{ value: "MXN", label: "MXN (Mex$)" },
{ value: "MYR", label: "MYR (RM)" },
{ value: "PLN", label: "PLN (zł)" },
{ value: "CZK", label: "CZK (Kč)" },
{ value: "NZD", label: "NZD (NZ$)" },
{ value: "AED", label: "AED (د.إ)" },
{ value: "ETH", label: "ETH (Ξ)" },
{ value: "APE", label: "APE (APE)" },
{ value: "COP", label: "COP ($)" },
{ value: "RON", label: "RON (lei)" },
{ value: "THB", label: "THB (฿)" },
{ value: "BGN", label: "BGN (лв)" },
{ value: "IDR", label: "IDR (Rp)" },
{ value: "DOP", label: "DOP (RD$)" },
{ value: "PHP", label: "PHP (₱)" },
{ value: "TRY", label: "TRY (₺)" },
{ value: "KRW", label: "KRW (₩)" },
{ value: "TWD", label: "TWD (NT$)" },
{ value: "VND", label: "VND (₫)" },
{ value: "PKR", label: "PKR (₨)" },
{ value: "CLP", label: "CLP ($)" },
{ value: "UYU", label: "UYU ($U)" },
{ value: "ARS", label: "ARS ($)" },
{ value: "ZAR", label: "ZAR (R)" },
{ value: "DZD", label: "DZD (دج)" },
{ value: "TND", label: "TND (د.ت)" },
{ value: "MAD", label: "MAD (DH)" },
{ value: "KES", label: "KES (KSh)" },
{ value: "KWD", label: "KWD (KD)" },
{ value: "JOD", label: "JOD (JD)" },
{ value: "ALL", label: "ALL (L)" },
{ value: "XCD", label: "XCD (EC$)" },
{ value: "AMD", label: "AMD (֏)" },
{ value: "BSD", label: "BSD (B$)" },
{ value: "BHD", label: "BHD (BD)" },
{ value: "BOB", label: "BOB (Bs.)" },
{ value: "BAM", label: "BAM (KM)" },
{ value: "KHR", label: "KHR (៛)" },
{ value: "CRC", label: "CRC (₡)" },
{ value: "XOF", label: "XOF (CFA)" },
{ value: "EGP", label: "EGP (£E)" },
{ value: "ETB", label: "ETB (Br)" },
{ value: "GMD", label: "GMD (D)" },
{ value: "GHS", label: "GHS (₵)" },
{ value: "GTQ", label: "GTQ (Q)" },
{ value: "GYD", label: "GYD (G$)" },
{ value: "ILS", label: "ILS (₪)" },
{ value: "JMD", label: "JMD (J$)" },
{ value: "MOP", label: "MOP (MOP$)" },
{ value: "MGA", label: "MGA (Ar)" },
{ value: "MUR", label: "MUR (₨)" },
{ value: "MDL", label: "MDL (L)" },
{ value: "MNT", label: "MNT (₮)" },
{ value: "NAD", label: "NAD (N$)" },
{ value: "NGN", label: "NGN (₦)" },
{ value: "MKD", label: "MKD (ден)" },
{ value: "OMR", label: "OMR (ر.ع.)" },
{ value: "PYG", label: "PYG (Gs.)" },
{ value: "PEN", label: "PEN (S/.)" },
{ value: "QAR", label: "QAR (ر.ق)" },
{ value: "RWF", label: "RWF (FRw)" },
{ value: "SAR", label: "SAR (ر.س)" },
{ value: "RSD", label: "RSD (din)" },
{ value: "LKR", label: "LKR (Rs)" },
{ value: "TZS", label: "TZS (TSh)" },
{ value: "TTD", label: "TTD (TT$)" },
{ value: "UZS", label: "UZS (so'm)" },
{ value: "RUB", label: "RUB (₽)" },
{ value: "BTC", label: "BTC (₿)" },
{ value: "CNY", label: "CNY (¥)" }
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
			<DialogContent className="max-w-2xl bg-white/90 dark:bg-gray-a1/50 backdrop-blur-xl border-gray-a4 dark:border-gray-a5 max-h-[90vh] overflow-hidden p-6 [&>button.absolute]:hidden">
				<DialogHeader className="relative">
					<DialogTitle className="text-6 font-semibold text-gray-12 dark:text-gray-12 pr-8">
						Edit Book
					</DialogTitle>
					<button
						onClick={onClose}
						className="absolute right-0 top-0 rounded-sm transition-all hover:bg-gray-a3 focus:outline-none focus:ring-2 focus:ring-gray-a8 focus:ring-offset-2 p-1.5 text-gray-12 dark:text-gray-12 hover:text-gray-12 shrink-0"
						aria-label="Close"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					{/* Title */}
					<div>
						<Label htmlFor="edit-title" className="text-4 text-gray-12 dark:text-gray-11 mb-2 block">
							Title <span className="text-red-11">*</span>
						</Label>
						<Input
							id="edit-title"
							type="text"
							value={formData.title}
							onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
							required
							className="bg-white dark:bg-gray-a2/80 backdrop-blur-sm border-gray-a4 text-gray-12 dark:text-gray-12"
						/>
					</div>

					{/* Subtitle */}
					<div>
						<Label htmlFor="edit-subtitle" className="text-4 text-gray-12 dark:text-gray-11 mb-2 block">
							Subtitle
						</Label>
						<Input
							id="edit-subtitle"
							type="text"
							value={formData.subtitle}
							onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
							className="bg-white dark:bg-gray-a2/80 backdrop-blur-sm border-gray-a4 text-gray-12 dark:text-gray-12"
						/>
					</div>

					{/* Description */}
					<div>
						<Label htmlFor="edit-description" className="text-4 text-gray-12 dark:text-gray-11 mb-2 block">
							Description
						</Label>
						<Textarea
							id="edit-description"
							value={formData.description}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
							rows={2}
							className="bg-white dark:bg-gray-a2/80 backdrop-blur-sm border-gray-a4 resize-none text-gray-12 dark:text-gray-12"
						/>
					</div>

					{/* Behind Paywall Toggle */}
					<div className="flex items-center gap-3 p-3 rounded-lg bg-gray-a1/50 dark:bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
						<input
							type="checkbox"
							id="edit-behind-paywall"
							checked={formData.isBehindPaywall}
							onChange={(e) => setFormData((prev) => ({ ...prev, isBehindPaywall: e.target.checked }))}
							className="h-4 w-4 rounded border-gray-a4 accent-blue-9"
						/>
						<Label htmlFor="edit-behind-paywall" className="text-4 text-gray-12 dark:text-gray-11 cursor-pointer">
							Behind Paywall
						</Label>
					</div>

					{/* Price and Currency (shown when paywall is enabled) */}
					{formData.isBehindPaywall && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="edit-price" className="text-4 text-gray-12 dark:text-gray-11 mb-2 block">
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
									className="bg-white dark:bg-gray-a2/80 backdrop-blur-sm border-gray-a4 text-gray-12 dark:text-gray-12"
								/>
							</div>
							<div>
								<Label htmlFor="edit-currency" className="text-4 text-gray-12 dark:text-gray-11 mb-2 block">
									Currency <span className="text-red-11">*</span>
								</Label>
								<select
									id="edit-currency"
									value={formData.currency}
									onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
									required
									className="flex h-10 w-full rounded-md border border-gray-a4 bg-white dark:bg-gray-a2/80 backdrop-blur-sm px-3 py-2 text-sm text-gray-12 dark:text-gray-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-a8 focus-visible:ring-offset-2"
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
						<div className="rounded-lg border border-red-a4 bg-red-a2/80 backdrop-blur-sm p-3">
							<p className="text-sm text-red-11">{error}</p>
						</div>
					)}

					{/* Success Message */}
					{success && (
						<div className="rounded-lg border border-green-a4 bg-green-a2/80 backdrop-blur-sm p-3">
							<p className="text-sm text-green-11">Book updated successfully!</p>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-3 justify-end pt-4">
						<Button
							type="button"
							variant="ghost"
							size="4"
							onClick={onClose}
							disabled={isSubmitting}
							className="bg-gray-a1 dark:bg-gray-a2/80 backdrop-blur-sm border border-gray-a4 hover:bg-gray-a2 dark:hover:bg-gray-a3/80 px-4 py-2 text-gray-12 dark:text-gray-12"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="classic"
							size="4"
							disabled={isSubmitting}
							className="bg-blue-9 hover:bg-blue-10 text-white px-4 py-2"
						>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

