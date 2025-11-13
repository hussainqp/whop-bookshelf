'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Home, FileText, BarChart3, CreditCard, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarNavigation() {
	const pathname = usePathname();
	const [isOnboarding, setIsOnboarding] = useState(false);
	const [mounted, setMounted] = useState(false);
	const { setOpenMobile } = useSidebar();
	const [isMobile, setIsMobile] = useState(false);

	// Check for onboarding attribute
	useEffect(() => {
		setMounted(true);
		const checkOnboarding = () => {
			setIsOnboarding(document.documentElement.getAttribute('data-onboarding') === 'true');
		};
		
		checkOnboarding();
		
		// Watch for attribute changes
		const observer = new MutationObserver(checkOnboarding);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-onboarding'],
		});
		
		return () => observer.disconnect();
	}, []);

	// Detect if we're on mobile
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Extract companyId from pathname if we're in dashboard routes
	const dashboardMatch = pathname.match(/\/dashboard\/([^/]+)/);
	const companyId = dashboardMatch ? dashboardMatch[1] : null;

	// Don't show sidebar on submit pages or during onboarding
	if (!mounted) {
		return null;
	}

	if (pathname.startsWith('/submit/') || isOnboarding || !companyId) {
		return null;
	}

	const isHome = pathname === `/dashboard/${companyId}`;
	const isReviews = pathname === `/dashboard/${companyId}/reviews`;
	const isAnalytics = pathname === `/dashboard/${companyId}/analytics`;
	const isBilling = pathname === `/dashboard/${companyId}/billing`;
	const isExperiences = pathname === `/dashboard/${companyId}/experiences`;

	const menuItems = [
		{
			title: "Home",
			url: `/dashboard/${companyId}`,
			icon: Home,
			isActive: isHome,
		},
		{
			title: "Reviews",
			url: `/dashboard/${companyId}/reviews`,
			icon: FileText,
			isActive: isReviews,
		},
		{
			title: "Analytics",
			url: `/dashboard/${companyId}/analytics`,
			icon: BarChart3,
			isActive: isAnalytics,
		},
		{
			title: "Billing",
			url: `/dashboard/${companyId}/billing`,
			icon: CreditCard,
			isActive: isBilling,
		},
		{
			title: "Hall Of Reviews",
			url: `/dashboard/${companyId}/experiences`,
			icon: Eye,
			isActive: isExperiences,
		},
	];

	// Close mobile sidebar when link is clicked
	const handleLinkClick = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	return (
		<Sidebar collapsible="none">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{menuItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={item.isActive}
										className={cn(
											item.isActive && "bg-gray-a4 text-gray-12"
										)}
									>
										<Link href={item.url} onClick={handleLinkClick}>
											<item.icon />
											<span className="ml-2 whitespace-nowrap">{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

