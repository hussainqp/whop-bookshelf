"use client";

import { useState, useEffect } from "react";

export interface Book {
	id: string;
	title: string;
	coverImage?: string;
	coverColor?: string;
	coverGradient?: string;
	flipbookUrl?: string;
	pdfUrl?: string;
	isBehindPaywall?: boolean;
	price?: number;
	currency?: string;
}

interface BookshelfProps {
	books: Book[];
	shelfImage?: string;
	onBookClick?: (book: Book) => void;
}

function useBooksPerShelf() {
	const [booksPerShelf, setBooksPerShelf] = useState(4);

	useEffect(() => {
		const calculateBooksPerShelf = () => {
			const width = window.innerWidth;
			if (width < 640) {
				// Mobile
				setBooksPerShelf(2);
			} else if (width < 768) {
				// Small tablet
				setBooksPerShelf(3);
			} else if (width < 1024) {
				// Tablet
				setBooksPerShelf(4);
			} else {
				// Desktop
				setBooksPerShelf(5);
			}
		};

		// Calculate on mount
		calculateBooksPerShelf();

		// Add resize listener
		window.addEventListener("resize", calculateBooksPerShelf);

		// Cleanup
		return () => window.removeEventListener("resize", calculateBooksPerShelf);
	}, []);

	return booksPerShelf;
}

export default function Bookshelf({
	books,
	shelfImage = "/shelf-background.png.png",
	onBookClick,
}: BookshelfProps) {
	const booksPerShelf = useBooksPerShelf();

	// Group books into shelves
	const shelves: Book[][] = [];
	for (let i = 0; i < books.length; i += booksPerShelf) {
		shelves.push(books.slice(i, i + booksPerShelf));
	}

	return (
		<div className="w-full p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl">
			<div className="space-y-0">
				{shelves.map((shelfBooks, shelfIndex) => (
					<div
						key={shelfIndex}
						className="relative w-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-end px-4 sm:px-6 md:px-8 lg:px-10 pt-8 sm:pt-12 md:pt-16 lg:pt-20"
						style={{
							backgroundImage: `url("${shelfImage}")`,
							backgroundSize: "100% 100%",
							backgroundRepeat: "no-repeat",
							backgroundPosition: "center",
						}}
					>
						{/* Books on shelf */}
						<div className="flex gap-2 sm:gap-4 md:gap-6 lg:gap-8 justify-center items-end pb-2 sm:pb-3 md:pb-4 flex-wrap">
							{shelfBooks.map((book) => (
								<BookItem key={book.id} book={book} onBookClick={onBookClick} />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function BookItem({ book, onBookClick }: { book: Book; onBookClick?: (book: Book) => void }) {
	const coverStyle: React.CSSProperties = {
		backgroundImage: book.coverImage
			? `url(${book.coverImage})`
			: book.coverGradient
				? `linear-gradient(${book.coverGradient})`
				: undefined,
		backgroundColor: book.coverColor || "#6366f1",
		backgroundSize: "cover",
		backgroundPosition: "center",
	};

	const isClickable = book.pdfUrl && onBookClick;

	const handleClick = () => {
		if (isClickable) {
			onBookClick(book);
		}
	};

	return (
		<div className="relative group">
			{/* Book shadow - positioned on the shelf floor */}
			<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[80%] h-1 sm:h-1.5 md:h-2 bg-black/10 blur-sm sm:blur-md rounded-full" />

			{/* Book cover with 3D perspective */}
			<div
				className={`relative w-20 h-32 sm:w-24 sm:h-36 md:w-28 md:h-44 lg:w-36 lg:h-52 rounded-sm shadow-2xl transition-transform duration-300 ${
					isClickable ? "hover:scale-110 cursor-pointer" : "hover:scale-105"
				}`}
				style={{
					transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
					transformStyle: "preserve-3d",
				}}
				onClick={handleClick}
			>
				{/* Book cover */}
				<div
					className="w-full h-full rounded-sm overflow-hidden relative border border-black/10"
					style={coverStyle}
				>
					{/* Paid label */}
					{book.isBehindPaywall && (
						<div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 md:top-2 md:right-2 z-10">
							<span
								className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-lg"
								style={{
									backgroundColor: '#2563eb',
									border: '1px solid rgba(96, 165, 250, 0.7)',
									backdropFilter: 'blur(4px)',
								}}
							>
								<span
									className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[10px] font-bold uppercase tracking-wider drop-shadow-md"
									style={{
										color: '#ffffff',
									}}
								>
									Paid
								</span>
							</span>
						</div>
					)}
					{/* Book title overlay with gradient for readability */}
					<div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-transparent" />
					<div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-3 lg:p-4">
						<p className="text-white font-bold text-[8px] sm:text-[10px] md:text-xs lg:text-sm leading-tight drop-shadow-2xl uppercase tracking-wider">
							{book.title}
						</p>
					</div>
				</div>

				{/* Book spine effect for 3D look */}
				<div className="absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 md:w-1.5 bg-black/30 rounded-l-sm" />
			</div>
		</div>
	);
}

