"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@whop/react/components";
import { saveSettings } from "@/app/action/company";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Bookshelf, { type Book } from "./Bookshelf";
import {
	PREDEFINED_SHELF_IMAGES,
} from "@/lib/predefined-images";

interface SettingsFormProps {
	companyId: string;
	initialExperienceTitle?: string | null;
	initialExperienceBackground?: string | null;
	initialShelfBackgroundImage?: string | null;
}

// Dummy books for preview
const dummyBooks: Book[] = [
	{
		id: "preview-1",
		title: "Sample Book 1",
		subtitle: "A Preview Book",
		coverImage: "https://via.placeholder.com/200x300/4A90E2/FFFFFF?text=Book+1",
	},
	{
		id: "preview-2",
		title: "Sample Book 2",
		subtitle: "Another Preview",
		coverImage: "https://via.placeholder.com/200x300/E94B3C/FFFFFF?text=Book+2",
	},
	{
		id: "preview-3",
		title: "Sample Book 3",
		subtitle: "Preview Title",
		coverImage: "https://via.placeholder.com/200x300/50C878/FFFFFF?text=Book+3",
	},
];

export default function SettingsForm({
	companyId,
	initialExperienceTitle,
	initialExperienceBackground,
	initialShelfBackgroundImage,
}: SettingsFormProps) {
	const router = useRouter();
	const [isSubmitting, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Experience title
	const [experienceTitle, setExperienceTitle] = useState<string>(
		initialExperienceTitle || ""
	);

	// Experience background
	const [experienceBackground, setExperienceBackground] = useState<string>(
		initialExperienceBackground || ""
	);
	const [experienceBackgroundPreview, setExperienceBackgroundPreview] = useState<string | null>(
		initialExperienceBackground || null
	);

	// Shelf background image
	const [shelfBackgroundImage, setShelfBackgroundImage] = useState<string>(
		initialShelfBackgroundImage || ""
	);
	const [shelfBackgroundImagePreview, setShelfBackgroundImagePreview] = useState<string | null>(
		initialShelfBackgroundImage || null
	);

	const handleExperienceBackgroundSelect = (url: string) => {
		setExperienceBackground(url);
		setExperienceBackgroundPreview(url);
	};

	const handleExperienceBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const color = e.target.value;
		setExperienceBackground(color);
		setExperienceBackgroundPreview(color);
	};

	const handleShelfBackgroundSelect = (url: string) => {
		setShelfBackgroundImage(url);
		setShelfBackgroundImagePreview(url);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		startTransition(async () => {
			try {
				const result = await saveSettings({
					companyId,
					experienceTitle: experienceTitle || undefined,
					experienceBackground: experienceBackground || undefined,
					shelfBackgroundImage: shelfBackgroundImage || undefined,
				});

				if (result.success) {
					setSuccess(true);
					setTimeout(() => {
						router.refresh();
					}, 1000);
				}
			} catch (err) {
				console.error("Error saving settings:", err);
				setError(err instanceof Error ? err.message : "Failed to save settings");
			}
		});
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Settings Form */}
			<div className="bg-gray-a2 rounded-lg border border-gray-a4 p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Experience Title */}
					<div className="space-y-4">
						<Label htmlFor="experience-title" className="text-5 font-semibold text-gray-12">
							Experience Page Title
						</Label>
						<p className="text-3 text-gray-10">
							Set a custom title for the experience page.
						</p>
						<Input
							id="experience-title"
							type="text"
							value={experienceTitle}
							onChange={(e) => setExperienceTitle(e.target.value)}
							placeholder="Your Bookshelf"
							className="bg-gray-a1 border-gray-a4"
						/>
					</div>

					{/* Experience Background */}
					<div className="space-y-4">
						<Label htmlFor="experience-background" className="text-5 font-semibold text-gray-12">
							Experience Page Background
						</Label>
						<p className="text-3 text-gray-10">
							Select a background color for the experience page.
						</p>

						{/* Color Input */}
						<div>
							<Label htmlFor="experience-background-color" className="text-4 text-gray-11 mb-2 block">
								Background Color (Hex code)
							</Label>
							<div className="flex gap-2">
								<Input
									id="experience-background-color"
									type="color"
									value={
										experienceBackground.startsWith("#")
											? experienceBackground
											: "#ffffff"
									}
									onChange={handleExperienceBackgroundColorChange}
									className="bg-gray-a1 border-gray-a4 h-10 w-20 cursor-pointer"
								/>
								<Input
									type="text"
									value={experienceBackground.startsWith("#") ? experienceBackground : ""}
									onChange={(e) => {
										const value = e.target.value;
										if (value.startsWith("#") || value === "") {
											setExperienceBackground(value);
											setExperienceBackgroundPreview(value);
										}
									}}
									placeholder="#ffffff"
									className="bg-gray-a1 border-gray-a4 flex-1"
									pattern="^#[0-9A-Fa-f]{6}$"
								/>
							</div>
						</div>
					</div>

					{/* Shelf Background Image */}
					<div className="space-y-4">
						<Label htmlFor="shelf-background" className="text-5 font-semibold text-gray-12">
							Shelf Background Image
						</Label>
						<p className="text-3 text-gray-10">
							Select a predefined shelf background image. This image will be displayed on each shelf.
						</p>

						{/* Predefined Shelf Images */}
						<div>
							<Label className="text-4 text-gray-11 mb-3 block">
								Select Shelf Background
							</Label>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
								{PREDEFINED_SHELF_IMAGES.map((shelf) => (
									<button
										key={shelf.id}
										type="button"
										onClick={() => handleShelfBackgroundSelect(shelf.url)}
										className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all ${
											shelfBackgroundImage === shelf.url
												? "border-blue-9 ring-2 ring-blue-9"
												: "border-gray-a4 hover:border-gray-a6"
										}`}
										style={{
											backgroundImage: `url("${shelf.url}")`,
											backgroundSize: "cover",
											backgroundPosition: "center",
										}}
										title={shelf.name}
									>
										<div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
											<span className="text-xs font-medium text-white bg-black/60 px-2 py-1 rounded">
												{shelf.name}
											</span>
										</div>
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Error Message */}
					{error && (
						<div className="rounded-lg border border-red-a4 bg-red-a2 p-3">
							<p className="text-sm text-red-11">{error}</p>
						</div>
					)}

					{/* Success Message */}
					{success && (
						<div className="rounded-lg border border-green-a4 bg-green-a2 p-3">
							<p className="text-sm text-green-11">Settings saved successfully!</p>
						</div>
					)}

					{/* Submit Button */}
					<Button
						type="submit"
						variant="classic"
						size="4"
						disabled={isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Saving..." : "Save Settings"}
					</Button>
				</form>
			</div>

			{/* Preview */}
			<div className="bg-gray-a2 rounded-lg border border-gray-a4 p-6">
				<h2 className="text-5 font-semibold text-gray-12 mb-4">Preview</h2>
				<p className="text-3 text-gray-10 mb-6">
					See how your bookshelf will look with the selected settings.
				</p>
				<div
					className="rounded-lg border border-gray-a4 p-4 min-h-[400px]"
					style={{
						backgroundImage: experienceBackgroundPreview?.startsWith("#")
							? "none"
							: experienceBackgroundPreview
							? `url("${experienceBackgroundPreview}")`
							: "none",
						backgroundColor: experienceBackgroundPreview?.startsWith("#")
							? experienceBackgroundPreview
							: experienceBackgroundPreview
							? "transparent"
							: "#ffffff",
						backgroundSize: "cover",
						backgroundPosition: "center",
						backgroundRepeat: "no-repeat",
					}}
				>
					<div className="rounded-2xl">
						<Bookshelf
							books={dummyBooks}
							shelfImage={shelfBackgroundImagePreview || "/shelf-background.png.png"}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

