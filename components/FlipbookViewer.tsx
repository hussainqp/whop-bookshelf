"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getFlipbookEmbed } from "@/app/action/books";

interface FlipbookViewerProps {
	flipbookUrl: string;
	title: string;
	isOpen: boolean;
	onClose: () => void;
}

export default function FlipbookViewer({
	flipbookUrl,
	title,
	isOpen,
	onClose,
}: FlipbookViewerProps) {
	const [embedHtml, setEmbedHtml] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen && flipbookUrl) {
			setIsLoading(true);
			setError(null);
			setEmbedHtml(null);

			getFlipbookEmbed(flipbookUrl)
				.then((data) => {
					setEmbedHtml(data.html);
					setIsLoading(false);
				})
				.catch((err) => {
					console.error("Error fetching embed:", err);
					setError(err instanceof Error ? err.message : "Failed to load flipbook");
					setIsLoading(false);
				});
		}
	}, [isOpen, flipbookUrl]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-none w-screen h-screen max-h-screen p-0 flex flex-col m-0 rounded-none translate-x-0 translate-y-0 left-0 top-0">
				<DialogHeader className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-a4 shrink-0 bg-gray-a1 ">
					<div className="flex items-center justify-between">
						<DialogTitle className="text-4 sm:text-5 font-semibold text-gray-12 truncate pr-2">
							{title}
						</DialogTitle>
						<button
							onClick={onClose}
							className="rounded-sm transition-all hover:bg-gray-a3 focus:outline-none focus:ring-2 focus:ring-gray-a8 focus:ring-offset-2 p-1.5 sm:p-2 text-gray-12 hover:text-gray-12 shrink-0"
							aria-label="Close"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 sm:h-6 sm:w-6"
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
					</div>
				</DialogHeader>
				<div className="flex-1 overflow-hidden p-0 min-h-0">
					{isLoading && (
						<div className="flex items-center justify-center h-full w-full">
							<div className="text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-12 mx-auto mb-4"></div>
								<p className="text-gray-10">Loading flipbook...</p>
							</div>
						</div>
					)}
					{error && (
						<div className="flex items-center justify-center h-full w-full">
							<div className="text-center">
								<p className="text-red-11 mb-4">{error}</p>
								<p className="text-gray-10 text-3 mb-4">
									You can still view the flipbook by visiting the link directly.
								</p>
								<a
									href={flipbookUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-11 hover:underline"
								>
									Open in new tab
								</a>
							</div>
						</div>
					)}
					{embedHtml && !isLoading && !error && (
						<div className="w-full h-full">
							<div
								className="w-full h-full"
								dangerouslySetInnerHTML={{ __html: embedHtml }}
							/>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

