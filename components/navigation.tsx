'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function Navigation() {
	const pathname = usePathname();
	const [isOnboarding, setIsOnboarding] = useState(false);

	// Check for onboarding attribute
	useEffect(() => {
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

	// Extract companyId from pathname if we're in dashboard routes
	const dashboardMatch = pathname.match(/\/dashboard\/([^/]+)/);
	const companyId = dashboardMatch ? dashboardMatch[1] : null;

	// Don't show navigation on submit pages
	if (pathname.startsWith('/submit/')) {
		return null;
	}

	// Don't show navigation during onboarding
	if (isOnboarding) {
		return null;
	}

	// If we're in dashboard routes, show navigation menu
	if (companyId) {
		const isHome = pathname === `/dashboard/${companyId}`;
		const isReviews = pathname === `/dashboard/${companyId}/reviews`;
		const isAnalytics = pathname === `/dashboard/${companyId}/analytics`;
		const isBilling = pathname === `/dashboard/${companyId}/billing`;

		return (
			<nav className="border-b border-gray-a4 bg-gray-a2">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex h-16 items-center justify-between">
						<NavigationMenu>
							<NavigationMenuList>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link
											href={`/dashboard/${companyId}`}
											className={cn(
												navigationMenuTriggerStyle(),
												isHome && "bg-gray-a4 text-gray-12"
											)}
										>
											Home
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link
											href={`/dashboard/${companyId}/reviews`}
											className={cn(
												navigationMenuTriggerStyle(),
												isReviews && "bg-gray-a4 text-gray-12"
											)}
										>
											Reviews
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link
											href={`/dashboard/${companyId}/analytics`}
											className={cn(
												navigationMenuTriggerStyle(),
												isAnalytics && "bg-gray-a4 text-gray-12"
											)}
										>
											Analytics
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
								<NavigationMenuItem>
									<NavigationMenuLink asChild>
										<Link
											href={`/dashboard/${companyId}/billing`}
											className={cn(
												navigationMenuTriggerStyle(),
												isBilling && "bg-gray-a4 text-gray-12"
											)}
										>
											Billing
										</Link>
									</NavigationMenuLink>
								</NavigationMenuItem>
							</NavigationMenuList>
						</NavigationMenu>
					</div>
				</div>
			</nav>
		);
	}

	// No navigation for other pages
	return null;
}

