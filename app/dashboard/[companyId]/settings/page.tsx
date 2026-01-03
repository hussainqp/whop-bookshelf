import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import DashboardLayout from "@/components/DashboardLayout";
import SettingsForm from "@/components/SettingsForm";
import { getCompanyDataFromDB } from "@/app/action/company";

export default async function SettingsPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	const { companyId } = await params;
	// Ensure the user is logged in on whop.
	const { userId } = await whopsdk.verifyUserToken(await headers());

	// Fetch the neccessary data we want from whop.
	const [company, user, access, merchant] = await Promise.all([
		whopsdk.companies.retrieve(companyId),
		whopsdk.users.retrieve(userId),
		whopsdk.users.checkAccess(companyId, { id: userId }),
		getCompanyDataFromDB(companyId),
	]);

	return (
		<DashboardLayout companyId={companyId}>
			<main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
				<div className="max-w-7xl mx-auto">
					<h1 className="text-6 sm:text-7 md:text-8 font-bold text-gray-12 mb-4">
						Settings
					</h1>
					<p className="text-3 sm:text-4 text-gray-10 mb-6 sm:mb-8">
						Manage your bookshelf settings and preferences.
					</p>
					<SettingsForm
						companyId={companyId}
						initialExperienceTitle={merchant?.experienceTitle || null}
						initialExperienceTitleColor={merchant?.experienceTitleColor || null}
						initialExperienceBackground={merchant?.experienceBackground || null}
						initialShelfBackgroundImage={merchant?.shelfBackgroundImage || null}
					/>
				</div>
			</main>
		</DashboardLayout>
	);
}

