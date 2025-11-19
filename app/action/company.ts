'use server';

import { cache } from "react";
import { whopsdk } from "@/lib/whop-sdk";
import { verifyUser } from "@/app/action/authentication";
import db from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const getCompany = cache(async (companyId: string) => {
	try {
		await verifyUser(companyId);
		const company = await whopsdk.companies.retrieve(companyId);
		return company;
	} catch (err: unknown) {
		console.error('[GET COMPANY] Error while retrieving company:', err);
		throw new Error("Failed to retrieve company");
	}
});

export async function saveInitialCompany({
	companyId,
	name
}: {
	companyId: string;
	name?: string | null;
}) {
	try {
		if (!companyId) {
			throw new Error("companyId is required");
		}
		await verifyUser(companyId);
		
		await db
			.insert(merchants)
			.values({
				companyId,
				name: name ?? null,
				displayFormat: 'grid',
			})
			.onConflictDoNothing({ target: merchants.companyId });

		return { success: true } as const;
	} catch (err: unknown) {
		console.error('[SAVE INITIAL COMPANY] Error while saving company:', err);
		throw new Error("Failed to save company");
	}
}

export const getCompanyDataFromDB = cache(async (companyId: string) => {
	try {
		if (!companyId) {
			throw new Error("companyId is required");
		}
		await verifyUser(companyId);
		const rows = await db
			.select()
			.from(merchants)
			.where(eq(merchants.companyId, companyId))
			.limit(1);
		return rows[0] ?? null;
	} catch (err: unknown) {
		console.error('[GET COMPANY DATA FROM DB] Error while fetching company:', err);
		throw new Error("Failed to fetch company");
	}
});

// Public version without authentication (for public-facing pages)
export const getCompanyDataFromDBPublic = cache(async (companyId: string) => {
	try {
		if (!companyId) {
			return null;
		}
		const company = await getCompanyDataFromDB(companyId);
		const rows = await db
			.select()
			.from(merchants)
			.where(eq(merchants.companyId, companyId))
			.limit(1);
			console.log(rows);
		return rows[0] ?? null;
	} catch (err: unknown) {
		console.error('[GET COMPANY DATA FROM DB PUBLIC] Error while fetching company:', err);
		return null;
	}
});



export const getExperienceDataFromDBPublic = cache(async (experienceId: string) => {
	try {
		if (!experienceId) {
			return null;
		}

		const experience = await whopsdk.experiences.retrieve(experienceId);
		if (!experience.company) {
			return null;
		}
		const rows = await db
			.select()
			.from(merchants)
			.where(eq(merchants.companyId, experience.company.id))
			.limit(1);
		return rows[0] ?? null;
	} catch (err: unknown) {
		console.error('[GET EXPERIENCE DATA FROM DB PUBLIC] Error while fetching merchant:', err);
		return null;
	}
});

// Save settings for a company
export async function saveSettings({
	companyId,
	experienceTitle,
	experienceTitleColor,
	experienceBackground,
	shelfBackgroundImage,
}: {
	companyId: string;
	experienceTitle?: string;
	experienceTitleColor?: string; // Hex color code
	experienceBackground?: string; // URL or color
	shelfBackgroundImage?: string; // URL (from predefined images in public folder)
}) {
	try {
		await verifyUser(companyId);
		
		// Update merchant settings
		await db
			.update(merchants)
			.set({
				experienceTitle: experienceTitle || null,
				experienceTitleColor: experienceTitleColor || null,
				experienceBackground: experienceBackground || null,
				shelfBackgroundImage: shelfBackgroundImage || null,
			})
			.where(eq(merchants.companyId, companyId));
		
		return {
			success: true,
		} as const;
	} catch (err: unknown) {
		console.error('[SAVE SETTINGS] Error while saving settings:', err);
		if (err instanceof Error) {
			throw new Error(`Failed to save settings: ${err.message}`);
		}
		throw new Error("Failed to save settings");
	}
}
