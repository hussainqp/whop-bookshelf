import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import DashboardLayout from "@/components/DashboardLayout";
import { getAllBooks } from "@/app/action/books";
import BookList from "@/components/BookList";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	const { companyId } = await params;
	// Ensure the user is logged in on whop.
	const { userId } = await whopsdk.verifyUserToken(await headers());

	// Fetch the neccessary data we want from whop.
	const [company, user, access, books] = await Promise.all([
		whopsdk.companies.retrieve(companyId),
		whopsdk.users.retrieve(userId),
		whopsdk.users.checkAccess(companyId, { id: userId }),
		getAllBooks(companyId),
	]);

	return (
		<DashboardLayout companyId={companyId}>
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
					<div className="max-w-7xl mx-auto">
						<h1 className="text-6 sm:text-7 md:text-8 font-bold text-gray-12 mb-4">
							All Books
						</h1>
						<p className="text-3 sm:text-4 text-gray-10 mb-6 sm:mb-8">
							Manage and view all books in your collection.
						</p>

						{/* Books List */}
						<BookList books={books} companyId={companyId} />
					</div>
				</main>
		</DashboardLayout>
	);
}
