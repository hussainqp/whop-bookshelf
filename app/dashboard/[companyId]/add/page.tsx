import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import DashboardLayout from "@/components/DashboardLayout";
import AddBookForm from "@/components/AddBookForm";

export default async function AddBookPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	const { companyId } = await params;
	// Ensure the user is logged in on whop.
	const { userId } = await whopsdk.verifyUserToken(await headers());

	// Fetch the neccessary data we want from whop.
	const [company, user, access] = await Promise.all([
		whopsdk.companies.retrieve(companyId),
		whopsdk.users.retrieve(userId),
		whopsdk.users.checkAccess(companyId, { id: userId }),
	]);

	return (
		<DashboardLayout companyId={companyId}>
			<main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
				<div className="max-w-3xl mx-auto">
					<h1 className="text-6 sm:text-7 md:text-8 font-bold text-gray-12 mb-4">
						Add Book
					</h1>
					<p className="text-3 sm:text-4 text-gray-10 mb-6 sm:mb-8">
						Add a new book to your collection.
					</p>
					
					{/* Add Book Form */}
					<div className="bg-gray-a2 rounded-lg border border-gray-a4 p-4 sm:p-6">
						<AddBookForm companyId={companyId} />
					</div>
				</div>
			</main>
		</DashboardLayout>
	);
}

