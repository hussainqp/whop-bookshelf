"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

interface DashboardSidebarProps {
	companyId: string;
	isOpen: boolean;
	onClose: () => void;
}

export default function DashboardSidebar({ 
	companyId, 
	isOpen, 
	onClose 
}: DashboardSidebarProps) {
	const pathname = usePathname();

	const menuItems = [
		{
			label: "List all books",
			href: `/dashboard/${companyId}`,
			icon: "📚",
		},
		{
			label: "Add book",
			href: `/dashboard/${companyId}/add`,
			icon: "➕",
		},
		{
			label: "Settings",
			href: `/dashboard/${companyId}/settings`,
			icon: "⚙️",
		},
	];

	return (
		<>
			{/* Mobile Overlay */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 md:hidden"
					onClick={onClose}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`
					fixed md:static inset-y-0 left-0 z-50
					w-64 bg-gray-a1 border-r border-gray-a4 flex flex-col
					transform transition-transform duration-300 ease-in-out
					${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
				`}
			>
				{/* Sidebar Header */}
				<div className="p-6 border-b border-gray-a4 flex items-center justify-between">
					<h2 className="text-6 font-semibold text-gray-11">Bookshelf</h2>
					<button
						onClick={onClose}
						className="md:hidden p-2 hover:bg-gray-a2 rounded-lg transition-colors"
						aria-label="Close sidebar"
					>
						<X className="w-5 h-5 text-gray-10" />
					</button>
				</div>

				{/* Navigation Menu */}
				<nav className="flex-1 p-4 overflow-y-auto">
					<ul className="space-y-1">
						{menuItems.map((item) => {
							const isActive = pathname === item.href;
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={() => {
											// Close sidebar on mobile when navigating
											if (window.innerWidth < 768) {
												onClose();
											}
										}}
										className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
											isActive
												? "bg-gray-a2 text-gray-12 font-medium"
												: "text-gray-10 hover:bg-gray-a2"
										}`}
									>
										{isActive && (
											<div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-9 rounded-l-lg" />
										)}
										<span className="text-xl">{item.icon}</span>
										<span>{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>
			</aside>
		</>
	);
}

