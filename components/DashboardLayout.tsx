"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
	companyId: string;
	children: React.ReactNode;
}

export default function DashboardLayout({
	companyId,
	children,
}: DashboardLayoutProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	// Close sidebar when window is resized to desktop
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) {
				setIsSidebarOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<div className="flex h-screen bg-gray-a1">
			<DashboardSidebar
				companyId={companyId}
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
			/>
			<div className="flex-1 flex flex-col overflow-hidden md:ml-0">
				{/* Mobile Header with Menu Button */}
				<header className="md:hidden bg-gray-a1 border-b border-gray-a4 px-4 py-3 flex items-center gap-4">
					<button
						onClick={() => setIsSidebarOpen(true)}
						className="p-2 hover:bg-gray-a2 rounded-lg transition-colors"
						aria-label="Open sidebar"
					>
						<Menu className="w-5 h-5 text-gray-12" />
					</button>
					<h1 className="text-6 font-semibold text-gray-11">Bookshelf</h1>
				</header>

				{/* Main Content */}
				{children}
			</div>
		</div>
	);
}

