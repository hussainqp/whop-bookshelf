import Bookshelf, { type Book } from "@/components/Bookshelf";

// Sample books data - replace with actual user-uploaded books
const sampleBooks: Book[] = [
	{
		id: "1",
		title: "DELUXE YACHTS",
		coverGradient: "135deg, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%",
	},
	{
		id: "2",
		title: "INNOVATING THE FUTURE",
		coverGradient: "135deg, #1e293b 0%, #0f172a 50%, #000000 100%",
	},
	{
		id: "3",
		title: "INSPIRED OUTDOORS",
		coverGradient: "135deg, #84cc16 0%, #65a30d 50%, #4d7c0f 100%",
	},
	{
		id: "4",
		title: "A COMMITMENT FOR LIFE",
		coverGradient: "135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%",
	},
	{
		id: "5",
		title: "TRAVEL",
		coverGradient: "135deg, #f97316 0%, #ea580c 50%, #c2410c 100%",
	},
	{
		id: "6",
		title: "PORTFOLIO CONTENT CREATOR",
		coverGradient: "135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%",
	},
	{
		id: "7",
		title: "FASHION FIND YOUR STYLE",
		coverGradient: "135deg, #f97316 0%, #fb923c 50%, #fdba74 100%",
	},
	{
		id: "8",
		title: "JOURNEY NO.3",
		coverGradient: "135deg, #059669 0%, #047857 50%, #065f46 100%",
	},
	{
		id: "9",
		title: "PORTFOLIO CONTENT CREATOR",
		coverGradient: "135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%",
	},
	{
		id: "10",
		title: "FASHION FIND YOUR STYLE",
		coverGradient: "135deg, #f97316 0%, #fb923c 50%, #fdba74 100%",
	},
	{
		id: "11",
		title: "JOURNEY NO.3",
		coverGradient: "135deg, #059669 0%, #047857 50%, #065f46 100%",
	},
];

export default function DiscoverPage() {
	return (
		<div className="min-h-screen bg-white">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
				{/* Title */}
				<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
					Your Bookshelf
				</h1>

				{/* Bookshelf Component */}
				<Bookshelf books={sampleBooks} shelfImage="/shelf-background.png.png" />
			</div>
		</div>
	);
}
