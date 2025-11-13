"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import FlipbookViewer from "./FlipbookViewer";
import EditBookModal from "./EditBookModal";
import { deleteBook, updateBookOrder } from "@/app/action/books";
import { Button } from "@whop/react/components";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Book {
	id: string;
	title: string;
	subtitle?: string;
	description?: string;
	coverImage?: string;
	flipbookUrl?: string;
	heyzineId?: string;
	isBehindPaywall?: boolean;
	price?: number;
	currency?: string;
}

interface BookListProps {
	books: Book[];
	companyId: string;
}

export default function BookList({ books, companyId }: BookListProps) {
	const [selectedBook, setSelectedBook] = useState<Book | null>(null);
	const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
	const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
	const [isPending, startTransition] = useTransition();
	const [items, setItems] = useState(books);
	const router = useRouter();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px of movement before drag starts
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = items.findIndex((item) => item.id === active.id);
			const newIndex = items.findIndex((item) => item.id === over.id);

			const newItems = arrayMove(items, oldIndex, newIndex);
			setItems(newItems);

			// Update display order in database
			startTransition(async () => {
				try {
					const bookOrders = newItems.map((book, index) => ({
						bookId: book.id,
						displayOrder: index,
					}));

					await updateBookOrder({
						companyId,
						bookOrders,
					});

					// Refresh to get updated order
					router.refresh();
				} catch (error) {
					console.error("Failed to update book order:", error);
					// Revert on error
					setItems(items);
					alert(error instanceof Error ? error.message : "Failed to update book order");
				}
			});
		}
	};

	const handleDelete = (book: Book, e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering the book click
		setBookToDelete(book);
	};

	const handleEdit = (book: Book, e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering the book click
		setBookToEdit(book);
	};

	const handleEditSuccess = () => {
		router.refresh();
	};

	const confirmDelete = () => {
		if (!bookToDelete) return;

		startTransition(async () => {
			try {
				await deleteBook({
					bookId: bookToDelete.id,
					companyId,
				});
				// Refresh the page to show updated book list
				router.refresh();
				setBookToDelete(null);
			} catch (error) {
				console.error("Failed to delete book:", error);
				alert(error instanceof Error ? error.message : "Failed to delete book");
			}
		});
	};

	// Update items when books prop changes
	useEffect(() => {
		if (books.length > 0 && (items.length === 0 || books.length !== items.length)) {
			setItems(books);
		}
	}, [books, items.length]);

	if (items.length === 0) {
		return (
			<div className="bg-gray-a2 rounded-lg border border-gray-a4 p-12 text-center">
				<p className="text-gray-10 text-4">
					No books found. Add your first book to get started!
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="bg-gray-a2 rounded-lg border border-gray-a4 p-4 sm:p-6">
				{/* Drag and drop instruction */}
				<div className="mb-4 p-3 bg-blue-a2 border border-blue-a4 rounded-lg flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5 text-blue-11 shrink-0"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 8h16M4 16h16"
						/>
					</svg>
					<p className="text-3 text-blue-11">
						<strong>Tip:</strong> Drag and drop books to reorder them. The order will be reflected on the experience page.
					</p>
				</div>

				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={items.map((book) => book.id)}
						strategy={rectSortingStrategy}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{items.map((book, index) => (
								<SortableBookItem
									key={book.id}
									book={book}
									companyId={companyId}
									onDelete={handleDelete}
									onEdit={handleEdit}
									onClick={() => book.flipbookUrl && setSelectedBook(book)}
									isPending={isPending}
									position={index + 1}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			</div>

			{selectedBook && selectedBook.flipbookUrl && (
				<FlipbookViewer
					flipbookUrl={selectedBook.flipbookUrl}
					title={selectedBook.title}
					isOpen={!!selectedBook}
					onClose={() => setSelectedBook(null)}
				/>
			)}

			{/* Edit Book Modal */}
			{bookToEdit && (
				<EditBookModal
					isOpen={!!bookToEdit}
					onClose={() => setBookToEdit(null)}
					book={bookToEdit}
					companyId={companyId}
					onSuccess={handleEditSuccess}
				/>
			)}

			{/* Delete confirmation dialog */}
			{bookToDelete && (
				<Dialog open={!!bookToDelete} onOpenChange={() => setBookToDelete(null)}>
					<DialogContent className="max-w-md bg-gray-a1 backdrop-blur-xl border-gray-a5">
						<DialogHeader>
							<DialogTitle className="text-6 font-semibold text-gray-12">
								Delete Book
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<p className="text-4 text-gray-11">
								Are you sure you want to delete "{bookToDelete.title}"? This action
								will delete the book from both the database, it cannot
								be undone.
							</p>
							<div className="flex gap-3">
								<Button
									variant="ghost"
									size="4"
									onClick={() => setBookToDelete(null)}
									disabled={isPending}
									className="flex-1"
									style={{
										backgroundColor: '#f3f4f6',
										border: '1px solid #e5e7eb',
										color: '#111827',
									}}
								>
									Cancel
								</Button>
								<Button
									variant="classic"
									size="4"
									onClick={confirmDelete}
									disabled={isPending}
									className="flex-1"
									style={{
										backgroundColor: '#dc2626',
										border: 'none',
										color: '#ffffff',
									}}
									onMouseEnter={(e) => {
										if (!isPending) {
											e.currentTarget.style.backgroundColor = '#b91c1c';
										}
									}}
									onMouseLeave={(e) => {
										if (!isPending) {
											e.currentTarget.style.backgroundColor = '#dc2626';
										}
									}}
								>
									{isPending ? "Deleting..." : "Delete"}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}

function SortableBookItem({
	book,
	companyId,
	onDelete,
	onEdit,
	onClick,
	isPending,
	position,
}: {
	book: Book;
	companyId: string;
	onDelete: (book: Book, e: React.MouseEvent) => void;
	onEdit: (book: Book, e: React.MouseEvent) => void;
	onClick: () => void;
	isPending: boolean;
	position: number;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: book.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className="border border-gray-a4 rounded-lg p-4 bg-gray-a1 hover:bg-gray-a2 transition-colors relative group cursor-grab active:cursor-grabbing"
		>
			{/* Position indicator */}
			<div
				className="absolute top-2 left-2 z-10 flex items-center gap-1.5"
				style={{ pointerEvents: 'none' }}
			>
				<div
					className="px-2 py-0.5 rounded-md text-xs font-semibold"
					style={{
						backgroundColor: '#2563eb',
						color: '#ffffff',
					}}
				>
					#{position}
				</div>
				<div
					className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
					style={{
						backgroundColor: '#f3f4f6',
					}}
					title="Drag to reorder"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						style={{
							color: '#6b7280',
						}}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 8h16M4 16h16"
						/>
					</svg>
				</div>
			</div>

			{/* Action buttons */}
			<div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
				{/* Edit button */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						onEdit(book, e);
					}}
					onMouseDown={(e) => e.stopPropagation()}
					disabled={isPending}
					className="p-1.5 rounded-md text-white disabled:opacity-50 pointer-events-auto"
					style={{
						backgroundColor: '#2563eb',
					}}
					onMouseEnter={(e) => {
						if (!isPending) {
							e.currentTarget.style.backgroundColor = '#1d4ed8';
						}
					}}
					onMouseLeave={(e) => {
						if (!isPending) {
							e.currentTarget.style.backgroundColor = '#2563eb';
						}
					}}
					title="Edit book"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
						/>
					</svg>
				</button>
				{/* Delete button */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						onDelete(book, e);
					}}
					onMouseDown={(e) => e.stopPropagation()}
					disabled={isPending}
					className="p-1.5 rounded-md text-white disabled:opacity-50 pointer-events-auto"
					style={{
						backgroundColor: '#dc2626',
					}}
					onMouseEnter={(e) => {
						if (!isPending) {
							e.currentTarget.style.backgroundColor = '#b91c1c';
						}
					}}
					onMouseLeave={(e) => {
						if (!isPending) {
							e.currentTarget.style.backgroundColor = '#dc2626';
						}
					}}
					title="Delete book"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</button>
			</div>

			<div
				onClick={(e) => {
					e.stopPropagation();
					onClick();
				}}
				onMouseDown={(e) => {
					// Allow clicking but prevent drag if clicking on content
					if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'P' || (e.target as HTMLElement).tagName === 'H3') {
						e.stopPropagation();
					}
				}}
				className={book.flipbookUrl ? "cursor-pointer" : "cursor-default"}
			>
				{book.coverImage ? (
					<div className="w-full h-48 bg-gray-a3 rounded mb-3 overflow-hidden">
						<img
							src={book.coverImage}
							alt={book.title}
							className="w-full h-full object-cover"
						/>
					</div>
				) : (
					<div className="w-full h-48 bg-gray-a3 rounded mb-3 flex items-center justify-center">
						<span className="text-gray-10 text-4">No thumbnail</span>
					</div>
				)}
				<h3 className="font-semibold text-gray-12 mb-1">
					{book.title}
				</h3>
				{book.subtitle && (
					<p className="text-3 text-gray-10 mb-2">
						{book.subtitle}
					</p>
				)}
				{book.description && (
					<p className="text-2 text-gray-9 line-clamp-2">
						{book.description}
					</p>
				)}
				{book.flipbookUrl && (
					<p className="text-2 text-gray-9 mt-2">
						Click to preview
					</p>
				)}
			</div>
		</div>
	);
}

