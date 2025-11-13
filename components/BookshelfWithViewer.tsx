"use client";

import { useState, useTransition } from "react";
import Bookshelf, { type Book } from "./Bookshelf";
import FlipbookViewer from "./FlipbookViewer";
import PaywallModal from "./PaywallModal";
import { checkBookAccess } from "@/app/action/books";

interface BookshelfWithViewerProps {
	books: Book[];
	shelfImage?: string;
	experienceId: string;
	companyId: string;
}

export default function BookshelfWithViewer({
	books,
	shelfImage,
	experienceId,
	companyId,
}: BookshelfWithViewerProps) {
	const [selectedBook, setSelectedBook] = useState<Book | null>(null);
	const [showPaywall, setShowPaywall] = useState(false);
	const [paywallBook, setPaywallBook] = useState<Book | null>(null);
	const [isPending, startTransition] = useTransition();

	const checkAccessAndOpen = async (book: Book) => {
		try {
			const result = await checkBookAccess({
				bookId: book.id,
				experienceId,
			});

			if (result.hasAccess) {
				// User has access, open the flipbook
				setSelectedBook(book);
				setShowPaywall(false);
				setPaywallBook(null);
			} else {
				// User doesn't have access, open checkout modal (which will auto-trigger purchase)
				setPaywallBook(book);
				setShowPaywall(true);
			}
		} catch (error) {
			console.error("Error checking book access:", error);
			// On error, show paywall to be safe
			setPaywallBook(book);
			setShowPaywall(true);
		}
	};

	const handleBookClick = async (book: Book) => {
		if (!book.flipbookUrl) return;

		// If book is behind paywall, check access
		if (book.isBehindPaywall) {
			startTransition(() => {
				checkAccessAndOpen(book);
			});
		} else {
			// Book is not behind paywall, open directly
			setSelectedBook(book);
		}
	};

	const handlePurchaseSuccess = () => {
		// After successful purchase, check access again and open the book
		if (paywallBook) {
			startTransition(() => {
				checkAccessAndOpen(paywallBook);
			});
		}
	};

	return (
		<>
			<Bookshelf
				books={books}
				shelfImage={shelfImage}
				onBookClick={handleBookClick}
			/>
			{selectedBook && selectedBook.flipbookUrl && (
				<FlipbookViewer
					flipbookUrl={selectedBook.flipbookUrl}
					title={selectedBook.title}
					isOpen={!!selectedBook}
					onClose={() => setSelectedBook(null)}
				/>
			)}
			{showPaywall && paywallBook && (
				<PaywallModal
					isOpen={showPaywall}
					onClose={() => {
						setShowPaywall(false);
						setPaywallBook(null);
					}}
					bookTitle={paywallBook.title}
					bookId={paywallBook.id}
					companyId={companyId}
					price={paywallBook.price}
					currency={paywallBook.currency}
					onPurchaseSuccess={handlePurchaseSuccess}
				/>
			)}
		</>
	);
}

