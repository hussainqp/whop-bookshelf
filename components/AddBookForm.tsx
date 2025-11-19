"use client";

import { useState, useEffect } from "react";
import { Button } from "@whop/react/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBook, getUploadPath, getPdfPublicUrl } from "@/app/action/books";
import { checkCanCreateBook, checkSubscriptionStatus } from "@/app/action/subscription";
import { useRouter } from "next/navigation";
import SubscriptionModal from "./SubscriptionModal";
import { supabaseClient } from "@/lib/supabase-client";

interface AddBookFormProps {
	companyId: string;
}

export default function AddBookForm({ companyId }: AddBookFormProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
	const [canCreate, setCanCreate] = useState<boolean | null>(null);
	const [isFreeUser, setIsFreeUser] = useState<boolean | null>(null);
	const [formData, setFormData] = useState({
		title: "",
		subtitle: "",
		description: "",
		isBehindPaywall: false,
		price: "",
		currency: "USD",
		allowDownload: true,
		showFullScreen: true,
		showShareButton: true,
		showPrevNextButtons: true,
	});

	const [pdfFile, setPdfFile] = useState<File | null>(null);

	// Check subscription status on mount
	useEffect(() => {
		checkCanCreateBook(companyId)
			.then((result) => {
				setCanCreate(result.canCreate);
				if (!result.canCreate && result.requiresSubscription) {
					setShowSubscriptionModal(true);
				}
			})
			.catch((err) => {
				console.error("Error checking subscription:", err);
				setError("Failed to check subscription status");
			});
		
		// Check if user is on free plan
		checkSubscriptionStatus(companyId)
			.then((status) => {
				setIsFreeUser(!status.hasActiveSubscription);
			})
			.catch((err) => {
				console.error("Error checking subscription status:", err);
			});
	}, [companyId]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Prevent file changes during upload
		if (isSubmitting) {
			e.preventDefault();
			return;
		}
		
		const file = e.target.files?.[0];
		if (file) {
			if (file.type !== "application/pdf") {
				setError("Please upload a PDF file");
				return;
			}
			// Check file size (50MB = 50 * 1024 * 1024 bytes)
			const maxSize = 50 * 1024 * 1024; // 50MB in bytes
			if (file.size > maxSize) {
				setError("File size must be 50MB or less");
				return;
			}
			setPdfFile(file);
			setError(null);
			// Auto-fill title if empty
			if (!formData.title) {
				const fileName = file.name.replace(/\.[^/.]+$/, "");
				setFormData((prev) => ({ ...prev, title: fileName }));
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		
		// Prevent multiple submissions
		if (isSubmitting) {
			return;
		}
		
		setError(null);

		// Check subscription status before submitting
		const canCreateResult = await checkCanCreateBook(companyId);
		if (!canCreateResult.canCreate) {
			if (canCreateResult.requiresSubscription) {
				setShowSubscriptionModal(true);
			} else {
				const errorMessage = (canCreateResult as { reason: string | null }).reason || "Cannot create book";
				setError(errorMessage);
			}
			return;
		}

		if (!pdfFile) {
			setError("Please select a PDF file");
			return;
		}

		// Validate file size (50MB = 50 * 1024 * 1024 bytes)
		const maxSize = 50 * 1024 * 1024; // 50MB in bytes
		if (pdfFile.size > maxSize) {
			setError("File size must be 50MB or less");
			return;
		}

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

		setIsSubmitting(true);

		try {
			// Step 1: Get upload path from server
			const uploadInfo = await getUploadPath(companyId, pdfFile.name);
			
			// Step 2: Upload file directly to Supabase from client
			const { error: uploadError } = await supabaseClient.storage
				.from(uploadInfo.bucketName)
				.upload(uploadInfo.path, pdfFile, {
					contentType: 'application/pdf',
					upsert: false,
				});

			if (uploadError) {
				throw new Error(`Failed to upload PDF: ${uploadError.message}`);
			}

			// Step 3: Get public URL
			const { url: pdfUrl } = await getPdfPublicUrl(uploadInfo.path);

			// Step 4: Create book with the uploaded PDF URL
			const result = await createBook({
				companyId,
				pdfUrl,
				filePath: uploadInfo.path,
				fileSizeBytes: pdfFile.size,
				fileName: pdfFile.name,
				title: formData.title.trim() || undefined,
				subtitle: formData.subtitle.trim() || undefined,
				description: formData.description.trim() || undefined,
				isBehindPaywall: formData.isBehindPaywall,
				price: formData.isBehindPaywall && formData.price ? parseFloat(formData.price) : undefined,
				currency: formData.isBehindPaywall && formData.currency ? formData.currency : undefined,
				allowDownload: formData.allowDownload,
				showFullScreen: formData.showFullScreen,
				showShareButton: formData.showShareButton,
				showPrevNextButtons: formData.showPrevNextButtons,
			});

			if (result.success) {
				// Redirect to books list page
				router.replace(`/dashboard/${companyId}`);
				router.refresh();
			}
		} catch (err) {
			console.error("Error creating book:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to create book";
			setError(errorMessage);
			
			// If error is about subscription, show modal
			if (errorMessage.includes("subscription") || errorMessage.includes("Subscription")) {
				setShowSubscriptionModal(true);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubscriptionSuccess = async () => {
		// Refresh subscription status
		const result = await checkCanCreateBook(companyId);
		setCanCreate(result.canCreate);
		setShowSubscriptionModal(false);
		
		// Refresh free user status
		const status = await checkSubscriptionStatus(companyId);
		setIsFreeUser(!status.hasActiveSubscription);
		
		router.refresh();
	};

	// Show loading state while checking subscription
	if (canCreate === null) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-gray-11">Checking subscription status...</p>
			</div>
		);
	}

	// If user cannot create book and needs subscription, show only the modal
	if (canCreate === false) {
		return (
			<>
				<SubscriptionModal
					isOpen={showSubscriptionModal}
					onClose={() => setShowSubscriptionModal(false)}
					companyId={companyId}
					onPurchaseSuccess={handleSubscriptionSuccess}
				/>
				{!showSubscriptionModal && (
					<div className="flex items-center justify-center py-12">
						<Button
							variant="classic"
							size="4"
							onClick={() => setShowSubscriptionModal(true)}
							style={{
								backgroundColor: '#2563eb',
								border: 'none',
								color: '#ffffff',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = '#1d4ed8';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = '#2563eb';
							}}
						>
							Subscribe to Add Books
						</Button>
					</div>
				)}
			</>
		);
	}

	return (
		<>
			<SubscriptionModal
				isOpen={showSubscriptionModal}
				onClose={() => setShowSubscriptionModal(false)}
				companyId={companyId}
				onPurchaseSuccess={handleSubscriptionSuccess}
			/>
			<form onSubmit={handleSubmit} className="space-y-6">
			{/* Free Plan Tip Banner */}
			{isFreeUser && (
				<div className="rounded-lg border border-blue-a4 bg-blue-a2 p-4 backdrop-blur-sm">
					<div className="flex items-start gap-3">
						<div className="shrink-0 mt-0.5">
							<svg className="h-5 w-5 text-blue-11" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
						</div>
						<div className="flex-1">
							<p className="text-4 text-blue-11 mb-2">
								<strong>Free Plan:</strong> You can add 1 book for free. Subscribe to add unlimited books to your bookshelf.
							</p>
							<Button
								type="button"
								variant="classic"
								size="3"
								onClick={() => setShowSubscriptionModal(true)}
								style={{
									backgroundColor: '#2563eb',
									border: 'none',
									color: '#ffffff',
									padding: '0.5rem 1rem',
									fontSize: '0.875rem',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = '#1d4ed8';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = '#2563eb';
								}}
							>
								Subscribe for Unlimited
							</Button>
						</div>
					</div>
				</div>
			)}
			{/* PDF File Upload */}
			<div className="space-y-2">
				<Label htmlFor="pdf-file" className="text-gray-12">
					PDF File <span className="text-red-9">*</span>
				</Label>
				<Input
					id="pdf-file"
					type="file"
					accept=".pdf,application/pdf"
					onChange={handleFileChange}
					required
					disabled={isSubmitting}
					className="cursor-pointer"
				/>
				<p className="text-3 text-gray-10">
					Maximum file size: 50MB
				</p>
				{pdfFile && (
					<p className="text-3 text-gray-10">
						Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
					</p>
				)}
			</div>

			{/* Title */}
			<div className="space-y-2">
				<Label htmlFor="title" className="text-gray-12">
					Title <span className="text-red-9">*</span>
				</Label>
				<Input
					id="title"
					type="text"
					placeholder="Enter book title"
					value={formData.title}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, title: e.target.value }))
					}
					required
					disabled={isSubmitting}
				/>
			</div>

			{/* Subtitle */}
			<div className="space-y-2">
				<Label htmlFor="subtitle" className="text-gray-12">
					Subtitle
				</Label>
				<Input
					id="subtitle"
					type="text"
					placeholder="Enter book subtitle (optional)"
					value={formData.subtitle}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
					}
					disabled={isSubmitting}
				/>
			</div>

			{/* Description */}
			<div className="space-y-2">
				<Label htmlFor="description" className="text-gray-12">
					Description
				</Label>
				<textarea
					id="description"
					placeholder="Enter book description (optional)"
					value={formData.description}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, description: e.target.value }))
					}
					disabled={isSubmitting}
					rows={4}
					className="flex w-full rounded-md border border-gray-a4 bg-gray-a2 px-3 py-2 text-sm placeholder:text-gray-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-a8 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
				/>
			</div>

			{/* Paywall */}
			<div className="space-y-4 border-t border-gray-a4 pt-4">
				<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
					<input
						type="checkbox"
						id="isBehindPaywall"
						checked={formData.isBehindPaywall}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, isBehindPaywall: e.target.checked }))
						}
						disabled={isSubmitting}
						className="h-5 w-5 rounded border-gray-a4 accent-blue-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 shrink-0"
					/>
					<div className="space-y-0.5 flex-1">
						<Label htmlFor="isBehindPaywall" className="text-gray-12 cursor-pointer">
							Behind Paywall
						</Label>
						<p className="text-2 text-gray-10">
							Require users to have access before viewing this book
						</p>
					</div>
				</div>

				{/* Price and Currency - shown when paywall is enabled */}
				{formData.isBehindPaywall && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2">
						<div className="space-y-2">
							<Label htmlFor="price" className="text-gray-12">
								Price <span className="text-red-9">*</span>
							</Label>
							<Input
								id="price"
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								value={formData.price}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, price: e.target.value }))
								}
								required={formData.isBehindPaywall}
								disabled={isSubmitting}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="currency" className="text-gray-12">
								Currency <span className="text-red-9">*</span>
							</Label>
							<select
								id="currency"
								value={formData.currency}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, currency: e.target.value }))
								}
								required={formData.isBehindPaywall}
								disabled={isSubmitting}
								className="flex h-10 w-full rounded-md border border-gray-a4 bg-gray-a2 px-3 py-2 text-sm text-gray-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-a8 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="USD">USD ($)</option>
<option value="SGD">SGD (S$)</option>
<option value="INR">INR (₹)</option>
<option value="AUD">AUD (A$)</option>
<option value="BRL">BRL (R$)</option>
<option value="CAD">CAD (C$)</option>
<option value="DKK">DKK (kr)</option>
<option value="EUR">EUR (€)</option>
<option value="NOK">NOK (kr)</option>
<option value="GBP">GBP (£)</option>
<option value="SEK">SEK (kr)</option>
<option value="CHF">CHF</option>
<option value="HKD">HKD (HK$)</option>
<option value="HUF">HUF (Ft)</option>
<option value="JPY">JPY (¥)</option>
<option value="MXN">MXN ($)</option>
<option value="MYR">MYR (RM)</option>
<option value="PLN">PLN (zł)</option>
<option value="CZK">CZK (Kč)</option>
<option value="NZD">NZD (NZ$)</option>
<option value="AED">AED (د.إ)</option>
<option value="ETH">ETH (Ξ)</option>
<option value="APE">APE (APE)</option>
<option value="COP">COP ($)</option>
<option value="RON">RON (lei)</option>
<option value="THB">THB (฿)</option>
<option value="BGN">BGN (лв)</option>
<option value="IDR">IDR (Rp)</option>
<option value="DOP">DOP (RD$)</option>
<option value="PHP">PHP (₱)</option>
<option value="TRY">TRY (₺)</option>
<option value="KRW">KRW (₩)</option>
<option value="TWD">TWD (NT$)</option>
<option value="VND">VND (₫)</option>
<option value="PKR">PKR (₨)</option>
<option value="CLP">CLP ($)</option>
<option value="UYU">UYU ($U)</option>
<option value="ARS">ARS ($)</option>
<option value="ZAR">ZAR (R)</option>
<option value="DZD">DZD (دج)</option>
<option value="TND">TND (د.ت)</option>
<option value="MAD">MAD (DH)</option>
<option value="KES">KES (KSh)</option>
<option value="KWD">KWD (KD)</option>
<option value="JOD">JOD (JD)</option>
<option value="ALL">ALL (L)</option>
<option value="XCD">XCD (EC$)</option>
<option value="AMD">AMD (֏)</option>
<option value="BSD">BSD (B$)</option>
<option value="BHD">BHD (BD)</option>
<option value="BOB">BOB (Bs.)</option>
<option value="BAM">BAM (KM)</option>
<option value="KHR">KHR (៛)</option>
<option value="CRC">CRC (₡)</option>
<option value="XOF">XOF (CFA)</option>
<option value="EGP">EGP (£E)</option>
<option value="ETB">ETB (Br)</option>
<option value="GMD">GMD (D)</option>
<option value="GHS">GHS (₵)</option>
<option value="GTQ">GTQ (Q)</option>
<option value="GYD">GYD (G$)</option>
<option value="ILS">ILS (₪)</option>
<option value="JMD">JMD (J$)</option>
<option value="MOP">MOP (MOP$)</option>
<option value="MGA">MGA (Ar)</option>
<option value="MUR">MUR (₨)</option>
<option value="MDL">MDL (L)</option>
<option value="MNT">MNT (₮)</option>
<option value="NAD">NAD (N$)</option>
<option value="NGN">NGN (₦)</option>
<option value="MKD">MKD (ден)</option>
<option value="OMR">OMR (ر.ع.)</option>
<option value="PYG">PYG (Gs.)</option>
<option value="PEN">PEN (S/.)</option>
<option value="QAR">QAR (ر.ق)</option>
<option value="RWF">RWF (FRw)</option>
<option value="SAR">SAR (ر.س)</option>
<option value="RSD">RSD (din)</option>
<option value="LKR">LKR (Rs)</option>
<option value="TZS">TZS (TSh)</option>
<option value="TTD">TTD (TT$)</option>
<option value="UZS">UZS (so'm)</option>
<option value="RUB">RUB (₽)</option>
<option value="BTC">BTC (₿)</option>
<option value="CNY">CNY (¥)</option>

							</select>
						</div>
					</div>
				)}
			</div>

			{/* Advanced Settings */}
			<div className="space-y-4 border-t border-gray-a4 pt-6">
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="flex items-center justify-between w-full text-left"
					disabled={isSubmitting}
				>
					<Label className="text-gray-12 font-semibold cursor-pointer">
						Advanced Settings
					</Label>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-5 w-5 text-gray-10 transition-transform ${
							showAdvanced ? "rotate-180" : ""
						}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{showAdvanced && (
					<div className="space-y-4 pl-2">
						{/* Allow Download */}
						<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
							<input
								type="checkbox"
								id="allowDownload"
								checked={formData.allowDownload}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, allowDownload: e.target.checked }))
								}
								disabled={isSubmitting}
								className="h-5 w-5 rounded border-gray-a4 accent-blue-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 shrink-0"
							/>
							<div className="space-y-0.5 flex-1">
								<Label htmlFor="allowDownload" className="text-gray-12 cursor-pointer">
									Allow PDF Download
								</Label>
								<p className="text-2 text-gray-10">
									Allow users to download the original PDF file
								</p>
							</div>
						</div>

						{/* Show Fullscreen Button */}
						<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
							<input
								type="checkbox"
								id="showFullScreen"
								checked={formData.showFullScreen}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, showFullScreen: e.target.checked }))
								}
								disabled={isSubmitting}
								className="h-5 w-5 rounded border-gray-a4 accent-blue-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 shrink-0"
							/>
							<div className="space-y-0.5 flex-1">
								<Label htmlFor="showFullScreen" className="text-gray-12 cursor-pointer">
									Show Fullscreen Button
								</Label>
								<p className="text-2 text-gray-10">
									Display the fullscreen button on the flipbook
								</p>
							</div>
						</div>

						{/* Show Share Button */}
						<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
							<input
								type="checkbox"
								id="showShareButton"
								checked={formData.showShareButton}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, showShareButton: e.target.checked }))
								}
								disabled={isSubmitting}
								className="h-5 w-5 rounded border-gray-a4 accent-blue-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 shrink-0"
							/>
							<div className="space-y-0.5 flex-1">
								<Label htmlFor="showShareButton" className="text-gray-12 cursor-pointer">
									Show Share Button
								</Label>
								<p className="text-2 text-gray-10">
									Display the share button on the flipbook
								</p>
							</div>
						</div>

						{/* Show Previous/Next Buttons */}
						<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-a2/50 backdrop-blur-sm border border-gray-a4">
							<input
								type="checkbox"
								id="showPrevNextButtons"
								checked={formData.showPrevNextButtons}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										showPrevNextButtons: e.target.checked,
									}))
								}
								disabled={isSubmitting}
								className="h-5 w-5 rounded border-gray-a4 accent-blue-9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 mt-0.5 shrink-0"
							/>
							<div className="space-y-0.5 flex-1">
								<Label htmlFor="showPrevNextButtons" className="text-gray-12 cursor-pointer">
									Show Previous/Next Buttons
								</Label>
								<p className="text-2 text-gray-10">
									Display navigation buttons to move between pages
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Error Message */}
			{error && (
				<div className="rounded-lg border border-red-a4 bg-red-a2 p-4">
					<p className="text-sm text-red-11">{error}</p>
				</div>
			)}

			{/* Upload Status Message */}
			{isSubmitting && (
				<div className="rounded-lg border border-blue-a4 bg-blue-a2 p-4">
					<p className="text-sm text-blue-11">
						Uploading PDF and creating book... Please do not close this page.
					</p>
				</div>
			)}

			{/* Submit Button */}
			<div className="flex gap-4">
				<Button
					type="submit"
					variant="classic"
					size="4"
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					{isSubmitting ? "Creating Book..." : "Add Book"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="4"
					onClick={() => router.push(`/dashboard/${companyId}`)}
					disabled={isSubmitting}
					className="hidden sm:flex w-full sm:w-auto"
				>
					Cancel
				</Button>
			</div>
		</form>
		</>
	);
}

