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
			<DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[90vh] p-0 flex flex-col m-4">
				<DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-a4 shrink-0">
					<DialogTitle className="text-5 sm:text-6 font-semibold text-gray-12">
						{title}
					</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
					{isLoading && (
						<div className="flex items-center justify-center h-full min-h-[400px]">
							<div className="text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-12 mx-auto mb-4"></div>
								<p className="text-gray-10">Loading flipbook...</p>
							</div>
						</div>
					)}
					{error && (
						<div className="flex items-center justify-center h-full min-h-[400px]">
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
						<div className="w-full h-full min-h-[600px]">
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

