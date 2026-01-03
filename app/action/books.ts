'use server';

import { headers } from "next/headers";
import { verifyUser } from "./authentication";
import { saveInitialCompany, getCompanyDataFromDB } from "./company";
import { checkCanCreateBook, markFreeBookUsed, resetFreeBookUsed } from "./subscription";
import db from "@/lib/db";
import { flipbooks, bookAccess } from "@/lib/db/schema";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { whopsdk } from "@/lib/whop-sdk";
import { eq, desc, and, count } from "drizzle-orm";
import { cache } from "react";


// Generate upload path for direct client-side upload to Supabase
export async function getUploadPath(companyId: string, fileName: string) {
	try {
		await verifyUser(companyId);
		
		// Generate unique filename
		const timestamp = Date.now();
		const fileExt = fileName.split('.').pop() || 'pdf';
		const uploadPath = `${companyId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
		
		return {
			path: uploadPath,
			bucketName: process.env.SUPABASE_BUCKET_NAME || 'pdfs',
		} as const;
	} catch (err: unknown) {
		console.error('[GET UPLOAD PATH] Error:', err);
		throw new Error("Failed to generate upload path");
	}
}

// Get public URL for an uploaded file
export async function getPdfPublicUrl(filePath: string) {
	try {
		const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
		
		// Get public URL
		const { data: urlData } = supabase.storage
			.from(bucketName)
			.getPublicUrl(filePath);
		
		if (!urlData?.publicUrl) {
			throw new Error("Failed to get public URL for uploaded PDF");
		}
		
		return {
			url: urlData.publicUrl,
		} as const;
	} catch (err: unknown) {
		console.error('[GET PDF PUBLIC URL] Error:', err);
		throw new Error("Failed to get public URL");
	}
}

// Get upload path for thumbnail
export async function getThumbnailUploadPath(companyId: string, pdfFilePath: string) {
	try {
		await verifyUser(companyId);
		
		// Generate thumbnail path based on PDF path
		const thumbnailPath = pdfFilePath.replace(/\.pdf$/i, '-thumbnail.jpg');
		
		return {
			path: thumbnailPath,
			bucketName: process.env.SUPABASE_BUCKET_NAME || 'pdfs',
		} as const;
	} catch (err: unknown) {
		console.error('[GET THUMBNAIL UPLOAD PATH] Error:', err);
		throw new Error("Failed to generate thumbnail upload path");
	}
}

// Get all books for a company
export const getAllBooks = cache(async (companyId: string) => {
	try {
		// Verify user has access to company
		await verifyUser(companyId);
		
		// Query flipbooks for this company, ordered by display order and creation date
		const books = await db
			.select({
				id: flipbooks.id,
				title: flipbooks.title,
				subtitle: flipbooks.subtitle,
				description: flipbooks.description,
				thumbnailUrl: flipbooks.thumbnailUrl,
				flipbookUrl: flipbooks.flipbookUrl,
				pdfUrl: flipbooks.pdfUrl,
				pdfDownloadUrl: flipbooks.pdfDownloadUrl,
				isVisible: flipbooks.isVisible,
				isBehindPaywall: flipbooks.isBehindPaywall,
				price: flipbooks.price,
				currency: flipbooks.currency,
				displayOrder: flipbooks.displayOrder,
				createdAt: flipbooks.createdAt,
			})
			.from(flipbooks)
			.where(eq(flipbooks.companyId, companyId))
			.orderBy(flipbooks.displayOrder, desc(flipbooks.createdAt));
		
		// Map flipbooks to Book interface format
		return books.map((book: any) => ({
			id: book.id,
			title: book.title || "Untitled",
			coverImage: book.thumbnailUrl || undefined,
			coverColor: undefined,
			coverGradient: undefined,
			// Include additional data for the dashboard view
			subtitle: book.subtitle || undefined,
			description: book.description || undefined,
			flipbookUrl: book.flipbookUrl,
			pdfUrl: book.pdfUrl,
			pdfDownloadUrl: book.pdfDownloadUrl,
			isVisible: book.isVisible,
			isBehindPaywall: book.isBehindPaywall || false,
			price: book.price ? parseFloat(book.price) : undefined,
			currency: book.currency || undefined,
		}));
	} catch (err: unknown) {
		console.error('[GET ALL BOOKS] Error while fetching books:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to fetch books: ${err.message}`);
		}
		throw new Error("Failed to fetch books");
	}
});

export async function createBook({
	companyId,
	pdfUrl,
	filePath,
	fileSizeBytes,
	fileName,
	title,
	subtitle,
	description,
	isBehindPaywall,
	price,
	currency,
	allowDownload,
	showFullScreen,
	showShareButton,
	showPrevNextButtons,
	thumbnailUrl,
}: {
	companyId: string;
	pdfUrl: string; // Public URL of the uploaded PDF
	filePath: string; // Path in Supabase storage
	fileSizeBytes: number; // File size in bytes
	fileName: string;
	title?: string;
	subtitle?: string;
	description?: string;
	isBehindPaywall?: boolean;
	price?: number;
	currency?: string;
	allowDownload?: boolean;
	showFullScreen?: boolean;
	showShareButton?: boolean;
	showPrevNextButtons?: boolean;
	thumbnailUrl?: string | null;
}) {
	try {
		// Verify user has access to company
		await verifyUser(companyId);
		
		// Check if company can create a book (subscription check)
		const canCreate = await checkCanCreateBook(companyId);
		if (!canCreate.canCreate) {
			throw new Error(canCreate.reason || "Subscription required to add more books");
		}
		
		// Check if company exists in database, create if not
		let merchant = await getCompanyDataFromDB(companyId);
		if (!merchant) {
			// Get company info from Whop
			
			const company = await whopsdk.companies.retrieve(companyId);
			
			// Create merchant record
			await saveInitialCompany({
				companyId,
				name: (company as any).name || null,
			});
			
			merchant = await getCompanyDataFromDB(companyId);
			if (!merchant) {
				throw new Error("Failed to create merchant record");
			}
		}
		
		// Get the count of existing books to set displayOrder
		const existingBooks = await db
			.select({ id: flipbooks.id })
			.from(flipbooks)
			.where(eq(flipbooks.companyId, companyId));
		
		const newDisplayOrder = existingBooks.length;
		
		// If this is the first book (free book), mark it as used
		if (existingBooks.length === 0) {
			await markFreeBookUsed(companyId);
		}
		
		// Generate a unique ID for heyzineId (required by schema, but we're not using Heyzine)
		// Using a UUID-like format to maintain uniqueness
		const customId = `custom-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		
		// Save flipbook to database (using Supabase PDF URL directly, no Heyzine API call)
		const [flipbook] = await db
			.insert(flipbooks)
			.values({
				companyId: companyId, // This should match the text type in merchants
				heyzineId: customId, // Placeholder ID since we're not using Heyzine
				pdfUrl: pdfUrl,
				originalFilename: fileName,
				fileSizeBytes: fileSizeBytes,
				title: title || fileName,
				subtitle: subtitle || null,
				description: description || null,
				isBehindPaywall: isBehindPaywall ?? false,
				price: isBehindPaywall && price ? String(price) : null,
				currency: isBehindPaywall && currency ? currency : null,
				allowDownload: allowDownload ?? true,
				showFullScreen: showFullScreen ?? true,
				showShareButton: showShareButton ?? true,
				showPrevNextButtons: showPrevNextButtons ?? true,
				flipbookUrl: pdfUrl, // Use PDF URL as flipbook URL since we're rendering PDF directly
				thumbnailUrl: thumbnailUrl || null, // Thumbnail generated from PDF first page
				pdfDownloadUrl: pdfUrl, // Use the same PDF URL for download
				numPages: null, // Will be determined by the PDF viewer
				aspectRatio: null, // Will be determined by the PDF viewer
				isVisible: true,
				displayOrder: newDisplayOrder,
			})
			.returning();
		
		return {
			success: true,
			flipbook,
		} as const;
	} catch (err: unknown) {
		console.error('[CREATE BOOK] Error while creating book:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to create book: ${err.message}`);
		}
		throw new Error("Failed to create book");
	}
}

// Delete a book (from database)
export async function deleteBook({
	bookId,
	companyId,
}: {
	bookId: string;
	companyId: string;
}) {
	try {
		// Verify user has access to company
		await verifyUser(companyId);
		
		// Get the book to verify it belongs to the company
		const [book] = await db
			.select({
				bookCompanyId: flipbooks.companyId,
			})
			.from(flipbooks)
			.where(eq(flipbooks.id, bookId))
			.limit(1);
		
		if (!book) {
			throw new Error("Book not found");
		}
		
		// Verify the book belongs to the company
		if (book.bookCompanyId !== companyId) {
			throw new Error("Book does not belong to this company");
		}
		
		// Delete from database
		await db
			.delete(flipbooks)
			.where(eq(flipbooks.id, bookId));
		
		// Check if there are any books left for this company
		const [remainingBooks] = await db
			.select({ count: count() })
			.from(flipbooks)
			.where(eq(flipbooks.companyId, companyId));
		
		// If no books remain, reset freeBookUsed to false
		if (remainingBooks && remainingBooks.count === 0) {
			await resetFreeBookUsed(companyId);
			console.log('[DELETE BOOK] All books deleted, reset freeBookUsed to false', { companyId });
		}
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[DELETE BOOK] Error while deleting book:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to delete book: ${err.message}`);
		}
		throw new Error("Failed to delete book");
	}
}

// Check if user has access to a book
export async function checkBookAccess({
	bookId,
	experienceId,
}: {
	bookId: string;
	experienceId: string;
}) {
	try {
		// Get the book to check if it's behind paywall
		const [book] = await db
			.select({
				id: flipbooks.id,
				companyId: flipbooks.companyId,
				isBehindPaywall: flipbooks.isBehindPaywall,
			})
			.from(flipbooks)
			.where(eq(flipbooks.id, bookId))
			.limit(1);

		if (!book) {
			throw new Error("Book not found");
		}

		// If book is not behind paywall, user has access
		if (!book.isBehindPaywall) {
			return {
				hasAccess: true,
			} as const;
		}

		// If book is behind paywall, check if user has access in book_access table
		const headersList = await headers();
		const { userId } = await whopsdk.verifyUserToken(headersList);
		
		// Check if user has access to this book
		const [userAccess] = await db
			.select({
				id: bookAccess.id,
			})
			.from(bookAccess)
			.where(and(
				eq(bookAccess.bookId, bookId),
				eq(bookAccess.userId, userId)
			))
			.limit(1);

		const hasAccess = !!userAccess;

		return {
			hasAccess,
		} as const;
	} catch (err: unknown) {
		console.error('[CHECK BOOK ACCESS] Error while checking access:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to check book access: ${err.message}`);
		}
		throw new Error("Failed to check book access");
	}
}

// Grant access to a book for a user (called after successful purchase)
export async function grantBookAccess({
	bookId,
	pricePaid,
	currencyPaid,
	userId,
}: {
	bookId: string;
	pricePaid?: number;
	currencyPaid?: string;
	userId?: string; // Optional: if not provided, gets from headers
}) {
	try {
		// Get userId from parameter or headers
		let finalUserId: string;
		if (userId) {
			finalUserId = userId;
		} else {
			const headersList = await headers();
			const { userId: headerUserId } = await whopsdk.verifyUserToken(headersList);
			finalUserId = headerUserId;
		}

		// Check if access already exists
		const [existingAccess] = await db
			.select({
				id: bookAccess.id,
			})
			.from(bookAccess)
			.where(and(
				eq(bookAccess.bookId, bookId),
				eq(bookAccess.userId, finalUserId)
			))
			.limit(1);

		if (existingAccess) {
			// Access already granted
			return {
				success: true,
				alreadyHadAccess: true,
			} as const;
		}

		// Grant access
		await db
			.insert(bookAccess)
			.values({
				bookId: bookId,
				userId: finalUserId,
				purchasedAt: new Date().toISOString(),
				pricePaid: pricePaid ? String(pricePaid) : null,
				currencyPaid: currencyPaid || null,
			});

		return {
			success: true,
			alreadyHadAccess: false,
		} as const;
	} catch (err: unknown) {
		console.error('[GRANT BOOK ACCESS] Error while granting access:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to grant book access: ${err.message}`);
		}
		throw new Error("Failed to grant book access");
	}
}

// Update book display order
export async function updateBookOrder({
	companyId,
	bookOrders,
}: {
	companyId: string;
	bookOrders: Array<{ bookId: string; displayOrder: number }>;
}) {
	try {
		await verifyUser(companyId);
		
		// Update each book's display order
		await Promise.all(
			bookOrders.map(({ bookId, displayOrder }) =>
				db
					.update(flipbooks)
					.set({ displayOrder })
					.where(and(
						eq(flipbooks.id, bookId),
						eq(flipbooks.companyId, companyId)
					))
			)
		);
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[UPDATE BOOK ORDER] Error while updating book order:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to update book order: ${err.message}`);
		}
		throw new Error("Failed to update book order");
	}
}

// Update book details
export async function updateBook({
	bookId,
	companyId,
	title,
	subtitle,
	description,
	price,
	currency,
	isBehindPaywall,
}: {
	bookId: string;
	companyId: string;
	title?: string;
	subtitle?: string;
	description?: string;
	price?: number;
	currency?: string;
	isBehindPaywall?: boolean;
}) {
	try {
		await verifyUser(companyId);
		
		// Get the book to verify it belongs to the company
		const [book] = await db
			.select({
				id: flipbooks.id,
				bookCompanyId: flipbooks.companyId,
			})
			.from(flipbooks)
			.where(eq(flipbooks.id, bookId))
			.limit(1);
		
		if (!book) {
			throw new Error("Book not found");
		}
		
		// Verify the book belongs to the company
		if (book.bookCompanyId !== companyId) {
			throw new Error("Book does not belong to this company");
		}
		
		// Build update object with only provided fields
		const updateData: Record<string, any> = {};
		
		if (title !== undefined) updateData.title = title;
		if (subtitle !== undefined) updateData.subtitle = subtitle || null;
		if (description !== undefined) updateData.description = description || null;
		
		if (isBehindPaywall !== undefined) {
			updateData.isBehindPaywall = isBehindPaywall;
			if (isBehindPaywall) {
				// If enabling paywall, set price and currency if provided
				if (price !== undefined) updateData.price = String(price);
				if (currency !== undefined) updateData.currency = currency;
			} else {
				// If disabling paywall, clear price and currency
				updateData.price = null;
				updateData.currency = null;
			}
		} else {
			// If paywall status not changed, only update price/currency if provided
			if (price !== undefined) updateData.price = String(price);
			if (currency !== undefined) updateData.currency = currency;
		}
		
		// Update book details
		await db
			.update(flipbooks)
			.set(updateData)
			.where(eq(flipbooks.id, bookId));
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[UPDATE BOOK] Error while updating book:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to update book: ${err.message}`);
		}
		throw new Error("Failed to update book");
	}
}

