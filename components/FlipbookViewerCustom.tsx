"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import FlipbookViewer from "./flipbook/flipbook-viewer/flipbook-viewer";

interface FlipbookViewerCustomProps {
	pdfUrl: string;
	title: string;
	isOpen: boolean;
	onClose: () => void;
	shareUrl?: string | null;
	disableShare?: boolean;
}

export default function FlipbookViewerCustom({
	pdfUrl,
	title,
	isOpen,
	onClose,
	shareUrl = null,
	disableShare = false,
}: FlipbookViewerCustomProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-none w-screen h-screen max-h-screen p-0 flex flex-col m-0 rounded-none translate-x-0 translate-y-0 left-0 top-0 [&>button.absolute]:hidden">
				<DialogHeader className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-a4 shrink-0 bg-gray-a1">
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
				<div className="flex-1 overflow-hidden p-0 min-h-0 bg-gray-a1">
					{pdfUrl && (
						<div className="w-full h-full [&>div]:h-full! [&>div]:min-h-0! [&>div>div>div]:flex-1 [&>div>div>div]:min-h-0">
							<FlipbookViewer
								pdfUrl={pdfUrl}
								shareUrl={(shareUrl as any) || null}
								disableShare={disableShare}
								className="h-full! min-h-0!"
							/>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

