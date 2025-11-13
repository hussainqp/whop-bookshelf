import { Button } from "@whop/react/components";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { type Book } from "@/components/Bookshelf";
import { getAllBooks } from "@/app/action/books";
import BookshelfWithViewer from "@/components/BookshelfWithViewer";
import { getExperienceDataFromDBPublic } from "@/app/action/company";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	const { experienceId } = await params;
	// Ensure the user is logged in on whop.
	const { userId } = await whopsdk.verifyUserToken(await headers());

	// Fetch the neccessary data we want from whop.
	const [experience, user, access] = await Promise.all([
		whopsdk.experiences.retrieve(experienceId),
		whopsdk.users.retrieve(userId),
		whopsdk.users.checkAccess(experienceId, { id: userId }),
	]);

	const merchant = await getExperienceDataFromDBPublic(experienceId);
	console.log(merchant);
	// Fetch books for the company
	let books: Book[] = [];
	if (merchant) {
		try {
			books = await getAllBooks(merchant.companyId);
		} catch (error) {
			console.error('[EXPERIENCE PAGE] Error fetching books:', error);
			// Continue with empty books array if fetch fails
		}
	}

	// Check if user is admin (owner of the experience)
	// The experience object should have owner_id or we can check access permissions
	const isAdmin = 
		(experience as any).owner_id === userId || 
		(experience as any).owner?.id === userId ||
		access?.has_access === true && (access as any)?.role === "admin";

	// Get settings from merchant
	const experienceTitle = merchant?.experienceTitle || "Your Bookshelf";
	const experienceBackground = merchant?.experienceBackground || "#ffffff";
	const shelfBackgroundImage = merchant?.shelfBackgroundImage || "/shelf-background.png.png";

	return (
		<div
			className="min-h-screen"
			style={{
				backgroundImage: experienceBackground.startsWith("#")
					? "none"
					: experienceBackground
					? `url("${experienceBackground}")`
					: "none",
				backgroundColor: experienceBackground.startsWith("#")
					? experienceBackground
					: experienceBackground
					? "transparent"
					: "#ffffff",
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundRepeat: "no-repeat",
				backgroundAttachment: "fixed",
			}}
		>
			<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
				{/* Header with Add Book button for admins */}
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
						{experienceTitle}
					</h1>
					{isAdmin && (
						<Button variant="classic" size="3">
							Add Book
						</Button>
					)}
				</div>

				{/* Bookshelf */}
				{books.length > 0 && merchant ? (
					<BookshelfWithViewer 
						books={books} 
						shelfImage={shelfBackgroundImage} 
						experienceId={experienceId}
						companyId={merchant.companyId}
					/>
				) : (
					<EmptyBookshelf shelfImage={shelfBackgroundImage} />
				)}
			</div>
		</div>
	);
}

function EmptyBookshelf({ shelfImage }: { shelfImage?: string }) {
	const defaultShelfImage = shelfImage || "/shelf-background.png.png";
	return (
		<div className="w-full">
			{/* Empty bookshelf with 2 rows */}
			<div className="w-full p-4 sm:p-6 md:p-8 lg:p-12 rounded-2xl">
				<div className="space-y-0">
					{/* First empty shelf */}
					<div
						className="relative w-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-end px-4 sm:px-6 md:px-8 lg:px-10 pt-8 sm:pt-12 md:pt-16 lg:pt-20"
						style={{
							backgroundImage: `url("${defaultShelfImage}")`,
							backgroundSize: "100% 100%",
							backgroundRepeat: "no-repeat",
							backgroundPosition: "center",
						}}
					>
						<div className="flex justify-center items-end pb-2 sm:pb-3 md:pb-4">
							{/* Empty shelf - no books */}
						</div>
					</div>

					{/* Second empty shelf */}
					<div
						className="relative w-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex flex-col justify-end px-4 sm:px-6 md:px-8 lg:px-10 pt-8 sm:pt-12 md:pt-16 lg:pt-20"
						style={{
							backgroundImage: `url("${defaultShelfImage}")`,
							backgroundSize: "100% 100%",
							backgroundRepeat: "no-repeat",
							backgroundPosition: "center",
						}}
					>
						<div className="flex justify-center items-end pb-2 sm:pb-3 md:pb-4">
							{/* Empty shelf - no books */}
						</div>
					</div>
				</div>
			</div>

			{/* Message below empty bookshelf */}
			<div className="text-center mt-8">
				<p className="text-lg sm:text-xl md:text-2xl text-gray-600">
					No books yet. Start building your collection!
				</p>
			</div>
		</div>
	);
}
