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


// Upload PDF to Supabase storage
async function uploadPdfToSupabase(
	file: File,
	companyId: string
): Promise<{ url: string; path: string }> {
	
	
	// Generate unique filename
	const timestamp = Date.now();
	const fileExt = file.name.split('.').pop();
	const fileName = `${companyId}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
	
	// Convert File to ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const fileBuffer = Buffer.from(arrayBuffer);
	
	// Upload to Supabase storage bucket (assuming bucket name is 'pdfs')
	const bucketName = process.env.SUPABASE_BUCKET_NAME || 'pdfs';
	
	const { data, error } = await supabase.storage
		.from(bucketName)
		.upload(fileName, fileBuffer, {
			contentType: file.type || 'application/pdf',
			upsert: false,
		});
	
	if (error) {
		console.error('[UPLOAD PDF] Error uploading to Supabase:', error);
		throw new Error(`Failed to upload PDF: ${error.message}`);
	}
	
	// Get public URL
	const { data: urlData } = supabase.storage
		.from(bucketName)
		.getPublicUrl(fileName);
	
	if (!urlData?.publicUrl) {
		throw new Error("Failed to get public URL for uploaded PDF");
	}
	
	return {
		url: urlData.publicUrl,
		path: fileName,
	};
}

// Call Heyzine API to create flipbook
async function createHeyzineFlipbook(
	pdfUrl: string,
	options: {
		title?: string;
		subtitle?: string;
		description?: string;
		clientId: string;
		allowDownload?: boolean;
		showFullScreen?: boolean;
		showShareButton?: boolean;
		showPrevNextButtons?: boolean;
	}
): Promise<{
	id: string;
	url: string;
	thumbnail: string;
	pdf: string;
	meta: {
		num_pages: number;
		aspect_ratio: number;
	};
}> {
	const heyzineApiKey = process.env.HEYZINE_API_KEY;
	const heyzineClientId = options.clientId || process.env.HEYZINE_CLIENT_ID;
	
	if (!heyzineApiKey || !heyzineClientId) {
		throw new Error("Heyzine API credentials are not configured");
	}
	
	const requestBody: Record<string, any> = {
		pdf: pdfUrl,
		client_id: heyzineClientId,
	};
	
	// Add optional parameters
	if (options.title) requestBody.title = options.title;
	if (options.subtitle) requestBody.subtitle = options.subtitle;
	if (options.description) requestBody.description = options.description;
	
	// Add display control parameters (mapping to Heyzine API format)
	if (options.allowDownload !== undefined) requestBody.download = options.allowDownload;
	if (options.showFullScreen !== undefined) requestBody.full_screen = options.showFullScreen;
	if (options.showShareButton !== undefined) requestBody.share = options.showShareButton;
	if (options.showPrevNextButtons !== undefined) requestBody.prev_next = options.showPrevNextButtons;
	
	// Call Heyzine REST API (sync endpoint)
	const response = await fetch('https://heyzine.com/api1/rest', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${heyzineApiKey}`,
		},
		body: JSON.stringify(requestBody),
	});
	
	if (!response.ok) {
		const errorText = await response.text();
		console.error('[HEYZINE API] Error response:', errorText);
		throw new Error(`Heyzine API error: ${response.status} ${response.statusText}`);
	}
	
	const data = await response.json();
	
	// Validate response structure
	if (!data.id || !data.url || !data.thumbnail || !data.pdf) {
		throw new Error("Invalid response from Heyzine API");
	}
	
	return data;
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
				heyzineId: flipbooks.heyzineId,
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
			heyzineId: book.heyzineId,
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
	pdfFile,
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
}: {
	companyId: string;
	pdfFile: File;
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
		
		// Upload PDF to Supabase
		const { url: pdfUrl, path: filePath } = await uploadPdfToSupabase(
			pdfFile,
			companyId
		);
		
		// Get file size
		const fileSizeBytes = pdfFile.size;
		
		// Call Heyzine API to create flipbook
		const heyzineResponse = await createHeyzineFlipbook(pdfUrl, {
			title: title || fileName,
			subtitle,
			description,
			clientId: process.env.HEYZINE_CLIENT_ID || '',
			allowDownload: allowDownload ?? true,
			showFullScreen: showFullScreen ?? true,
			showShareButton: showShareButton ?? true,
			showPrevNextButtons: showPrevNextButtons ?? true,
		});
		
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
		
		// Save flipbook to database
		const [flipbook] = await db
			.insert(flipbooks)
			.values({
				companyId: companyId, // This should match the text type in merchants
				heyzineId: heyzineResponse.id,
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
				flipbookUrl: heyzineResponse.url,
				thumbnailUrl: heyzineResponse.thumbnail || null,
				pdfDownloadUrl: heyzineResponse.pdf || null,
				numPages: heyzineResponse.meta?.num_pages || null,
				aspectRatio: heyzineResponse.meta?.aspect_ratio
					? String(heyzineResponse.meta.aspect_ratio)
					: null,
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

// Get oEmbed data from Heyzine for a flipbook URL
export async function getFlipbookEmbed(flipbookUrl: string) {
	try {
		// Encode the flipbook URL for the oEmbed API
		const encodedUrl = encodeURIComponent(flipbookUrl);
		
		// Call Heyzine oEmbed API
		const response = await fetch(
			`https://heyzine.com/api1/oembed?url=${encodedUrl}&format=json`,
			{
				method: 'GET',
				headers: {
					'Accept': 'application/json',
				},
			}
		);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[HEYZINE OEMBED] Error response:', errorText);
			throw new Error(`Heyzine oEmbed API error: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		// Validate response structure
		if (!data.html) {
			throw new Error("Invalid response from Heyzine oEmbed API");
		}
		
		return data;
	} catch (err: unknown) {
		console.error('[GET FLIPBOOK EMBED] Error while fetching embed:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to get flipbook embed: ${err.message}`);
		}
		throw new Error("Failed to get flipbook embed");
	}
}

// Delete a flipbook from Heyzine
async function deleteHeyzineFlipbook(heyzineId: string): Promise<void> {
	const heyzineApiKey = process.env.HEYZINE_API_KEY;
	
	if (!heyzineApiKey) {
		throw new Error("Heyzine API key is not configured");
	}
	
	// Based on Heyzine API documentation pattern, try DELETE endpoint
	// The API uses flipbook-details for GET, so we'll try DELETE with the id
	const response = await fetch('https://heyzine.com/api1/flipbook-details', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${heyzineApiKey}`,
		},
		body: JSON.stringify({ id: heyzineId }),
	});
	
	if (!response.ok) {
		// If DELETE on flipbook-details doesn't work, try alternative endpoint
		const altResponse = await fetch(`https://heyzine.com/api1/flipbook/${encodeURIComponent(heyzineId)}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${heyzineApiKey}`,
			},
		});
		
		if (!altResponse.ok) {
			const errorText = await altResponse.text().catch(() => 'Unknown error');
			console.error('[HEYZINE DELETE] Error response:', errorText);
			// Don't throw error - continue with DB deletion even if Heyzine deletion fails
			console.warn(`Failed to delete flipbook from Heyzine: ${heyzineId}. Continuing with database deletion.`);
		}
	}
}

// Delete a book (from database and Heyzine)
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
		
		// Get the book to retrieve heyzineId before deletion
		const [book] = await db
			.select({
				heyzineId: flipbooks.heyzineId,
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
		
		// Delete from Heyzine first
		if (book.heyzineId && typeof book.heyzineId === 'string') {
			try {
				await deleteHeyzineFlipbook(book.heyzineId);
			} catch (error) {
				// Log error but continue with DB deletion
				console.error('[DELETE BOOK] Error deleting from Heyzine:', error);
			}
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

