"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface AddBookInstructionsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const steps = [
	{
		number: 1,
		title: "Go to Dashboard",
		description: "Navigate to your Whop dashboard where you manage all your products and settings.",
		imagePlaceholder: "/instructions/Step 1.png",
	},
	{
		number: 2,
		title: "Go to Apps section and select Bookshelf",
		description: "In the dashboard sidebar, find the Apps section and click on the Bookshelf app.",
		imagePlaceholder: "/instructions/Step 2.png",
	},
	{
		number: 3,
		title: "Add books from the Admin Panel",
		description: "The admin panel will open where you can add new books. Your books will be reflected on the bookshelf immediately.",
		imagePlaceholder: "/instructions/Step 3.png",
	},
];

export default function AddBookInstructionsModal({
	isOpen,
	onClose,
}: AddBookInstructionsModalProps) {
	const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

	const handleImageError = (stepNumber: number) => {
		setImageErrors((prev) => ({ ...prev, [stepNumber]: true }));
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent 
				className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
				style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
			>
				<DialogHeader>
					<DialogTitle className="text-xl" style={{ color: "#ffffff" }}>
						How to Add Books
					</DialogTitle>
					<DialogDescription style={{ color: "#d1d5db" }}>
						Follow these steps to add books to your bookshelf
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-6">
					{steps.map((step) => (
						<div
							key={step.number}
							className="rounded-lg p-4"
							style={{ backgroundColor: "#374151", border: "1px solid #4b5563" }}
						>
							{/* Step header */}
							<div className="flex items-start gap-3 mb-3">
								<div 
									className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
									style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
								>
									{step.number}
								</div>
								<div>
									<h3 className="font-semibold" style={{ color: "#ffffff" }}>
										{step.title}
									</h3>
									<p className="text-sm mt-1" style={{ color: "#d1d5db" }}>
										{step.description}
									</p>
								</div>
							</div>

							{/* Image placeholder */}
							<div 
								className="mt-3 rounded-lg overflow-hidden"
								style={{ backgroundColor: "#1f2937", border: "1px solid #4b5563" }}
							>
								{imageErrors[step.number] ? (
									<div 
										className="aspect-video flex items-center justify-center"
										style={{ backgroundColor: "#1f2937" }}
									>
										<div className="text-center">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-12 w-12 mx-auto mb-2 opacity-50"
												fill="none"
												viewBox="0 0 24 24"
												stroke="#9ca3af"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.5}
													d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
											<p className="text-sm" style={{ color: "#ffffff" }}>
												Step {step.number} Screenshot
											</p>
										</div>
									</div>
								) : (
									<img
										src={step.imagePlaceholder}
										alt={`Step ${step.number}: ${step.title}`}
										className="w-full aspect-video object-cover"
										onError={() => handleImageError(step.number)}
									/>
								)}
							</div>
						</div>
					))}
				</div>

				<div className="mt-6 flex justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
						style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
						onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
						onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
					>
						Got it!
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

