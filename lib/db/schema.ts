import { pgTable, index, timestamp, integer, boolean, text, jsonb, uuid, varchar, bigint, decimal } from 'drizzle-orm/pg-core';

// Reusable timestamp columns
const timestamps = {
	createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).$onUpdate(() => new Date().toISOString()).notNull().defaultNow(),
};


// ============================================================================
// MERCHANTS TABLE
// ============================================================================
export const merchants = pgTable('merchants', {
	id: uuid("id").primaryKey().defaultRandom(),
	companyId: text('company_id').notNull().unique(), // Whop company/merchant ID
	email: text('email'),
	name: text('name'),
	
	// Bookshelf display settings
	displayFormat: text('display_format').notNull().default('grid'),
	experienceTitle: text('experience_title'), // Title for the experience page
	experienceTitleColor: text('experience_title_color'), // Color for the experience page title
	experienceBackground: text('experience_background'), // Background image/color for experience page
	shelfBackgroundImage: text('shelf_background_image'), // Background image for shelf rows
	
	// Subscription settings
	subscriptionStatus: text('subscription_status').default('free'), // 'free', 'active', 'cancelled', 'expired'
	subscriptionPlanId: text('subscription_plan_id'), // Whop plan ID
	subscriptionId: text('subscription_id'), // Whop subscription ID
	subscriptionStartedAt: timestamp('subscription_started_at', { mode: "string", withTimezone: true }),
	subscriptionExpiresAt: timestamp('subscription_expires_at', { mode: "string", withTimezone: true }),
	freeBookUsed: boolean('free_book_used').default(false), // Whether the free book has been used
	
	...timestamps,
}, (table: any) => ({
	companyIdIdx: index('merchants_company_id_idx').on(table.companyId)
}));

// ============================================================================
// FLIPBOOKS TABLE
// ============================================================================
export const flipbooks = pgTable('flipbooks', {
	id: uuid("id").primaryKey().defaultRandom(),
	companyId: text("company_id").references(() => merchants.companyId).notNull(), // References merchants.companyId
	heyzineId: varchar("heyzine_id", { length: 255 }).notNull().unique(),
	
	// PDF Information
	pdfUrl: text("pdf_url").notNull(),
	originalFilename: varchar("original_filename", { length: 255 }),
	fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
	
	// Flipbook Metadata
	title: varchar("title", { length: 500 }),
	subtitle: varchar("subtitle", { length: 500 }),
	description: text("description"),
	allowDownload: boolean("allow_download").default(true),
	showFullScreen: boolean("show_full_screen").default(true),
	showShareButton: boolean("show_share_button").default(true),
	showPrevNextButtons: boolean("show_prev_next_buttons").default(true),
	
	
	
	// Heyzine Response Data
	flipbookUrl: text("flipbook_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	pdfDownloadUrl: text("pdf_download_url"),
	numPages: integer("num_pages"),
	aspectRatio: decimal("aspect_ratio", { precision: 5, scale: 4 }),
	
	// Display Settings
	isVisible: boolean("is_visible").default(true),
	displayOrder: integer("display_order").default(0),
	
	// Password Protection
	isPasswordProtected: boolean("is_password_protected").default(false),
	accessMode: varchar("access_mode", { length: 50 }), // null, 'users', 'single_password'
	
	// Paywall
	isBehindPaywall: boolean("is_behind_paywall").default(false),
	price: decimal("price", { precision: 10, scale: 2 }), // Price in the specified currency
	currency: varchar("currency", { length: 10 }), // Currency code (e.g., 'USD', 'EUR', 'GBP')
	
	// Timestamps
	...timestamps,
}, (table: any) => ({
	ownerIdIdx: index("idx_owner_id").on(table.companyId),
	visibilityIdx: index("idx_visibility").on(table.companyId, table.isVisible),
	heyzineIdIdx: index("idx_heyzine_id").on(table.heyzineId),
}));

// ============================================================================
// BOOK ACCESS TABLE - Tracks which users have access to which books
// ============================================================================
export const bookAccess = pgTable('book_access', {
	id: uuid("id").primaryKey().defaultRandom(),
	bookId: uuid("book_id").references(() => flipbooks.id).notNull(),
	userId: text("user_id").notNull(), // Whop user ID
	// Optional: Track purchase details
	purchasedAt: timestamp("purchased_at", { mode: "string", withTimezone: true }),
	pricePaid: decimal("price_paid", { precision: 10, scale: 2 }),
	currencyPaid: varchar("currency_paid", { length: 10 }),
	...timestamps,
}, (table: any) => ({
	bookIdIdx: index("idx_book_access_book_id").on(table.bookId),
	userIdIdx: index("idx_book_access_user_id").on(table.userId),
	bookUserIdx: index("idx_book_access_book_user").on(table.bookId, table.userId), // Composite index for quick lookups
}));

