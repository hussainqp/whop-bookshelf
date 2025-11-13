"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "12rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContext = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
	const context = React.useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
}

const SidebarProvider = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		defaultOpen?: boolean;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}
>(
	(
		{
			defaultOpen = true,
			open: openProp,
			onOpenChange: setOpenProp,
			className,
			style,
			children,
			...props
		},
		ref
	) => {
		const [openMobile, setOpenMobile] = React.useState(false);

		// This is the internal state of the sidebar.
		// We use openProp and setOpenProp if the component is controlled.
		const [_open, _setOpen] = React.useState(defaultOpen);
		const open = openProp ?? _open;
		const setOpen = React.useCallback(
			(value: boolean | ((value: boolean) => boolean)) => {
				const openState = typeof value === "function" ? value(open) : value;
				if (setOpenProp) {
					setOpenProp(openState);
				} else {
					_setOpen(openState);
				}
			},
			[open, setOpenProp]
		);

		// Helper to toggle the sidebar.
		const toggleSidebar = React.useCallback(() => {
			return setOpen((open) => !open);
		}, [setOpen]);

		// Adds the keyboard shortcut to toggle the sidebar.
		React.useEffect(() => {
			const handleKeyDown = (event: KeyboardEvent) => {
				if (
					event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
					(event.metaKey || event.ctrlKey)
				) {
					event.preventDefault();
					toggleSidebar();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [toggleSidebar]);

		// We add a state so that we can do data-state="expanded" or "collapsed".
		// This makes it easier to style the sidebar with Tailwind classes.
		const state = open ? "expanded" : "collapsed";

		const contextValue = React.useMemo<SidebarContext>(
			() => ({
				state,
				open,
				setOpen,
				openMobile,
				setOpenMobile,
				toggleSidebar,
			}),
			[state, open, setOpen, openMobile, setOpenMobile, toggleSidebar]
		);

		return (
			<SidebarContext.Provider value={contextValue}>
				<TooltipProvider>
					<div
						style={
							{
								"--sidebar-width": SIDEBAR_WIDTH,
								"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
								...style,
							} as React.CSSProperties
						}
						className={cn(
							"group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]/sidebar-wrapper:bg-gray-a2",
							className
						)}
						ref={ref}
						{...props}
					>
						{children}
					</div>
				</TooltipProvider>
			</SidebarContext.Provider>
		);
	}
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		variant?: "sidebar" | "floating" | "inset";
		collapsible?: "offcanvas" | "icon" | "none";
	}
>(
	(
		{
			variant = "sidebar",
			collapsible = "offcanvas",
			className,
			children,
			...props
		},
		ref
	) => {
		const { openMobile, setOpenMobile, state, open } = useSidebar();

		if (collapsible === "none") {
			return (
				<>
					{/* Desktop Sidebar */}
					<div
						className={cn(
							"hidden md:flex h-screen shrink-0 flex-col bg-gray-a1 text-gray-12 border-r border-gray-a4",
							className
						)}
						style={{
							width: SIDEBAR_WIDTH,
							...props.style,
						} as React.CSSProperties}
						ref={ref}
						{...props}
					>
						{children}
					</div>

					{/* Mobile Overlay */}
					{openMobile && (
						<div
							className="fixed inset-0 z-50 bg-gray-a1/80 md:hidden"
							onClick={() => setOpenMobile(false)}
						/>
					)}

					{/* Mobile Sidebar */}
					<div
						data-state={openMobile ? "open" : "closed"}
						className={cn(
							"fixed inset-y-0 z-50 flex h-svh w-[--sidebar-width] flex-col border-r border-gray-a4 text-gray-12 transition-transform duration-200 ease-linear md:hidden",
							openMobile ? "translate-x-0" : "-translate-x-full"
						)}
						style={{ 
							backgroundColor: 'rgb(10, 10, 10)',
							backdropFilter: 'none'
						}}
					>
						{children}
					</div>
				</>
			);
		}

		if (collapsible === "icon") {
			return (
				<div
					className={cn(
						"group peer hidden md:block text-gray-12",
						"transition-[width] duration-200 ease-linear shrink-0",
						className
					)}
					data-collapsible="icon"
					data-state={state}
					style={{
						width: state === "expanded" ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON,
						...props.style,
					} as React.CSSProperties}
					ref={ref}
					{...props}
				>
					<div
						data-state={state}
						className={cn(
							"flex h-screen w-full flex-col bg-gray-a1 border-r border-gray-a4",
							"group-data-[collapsible=icon]:transition-[width]"
						)}
					>
						{children}
					</div>
				</div>
			);
		}

		return (
			<>
				{/* Mobile Sidebar */}
				<div
					data-state={openMobile ? "open" : "closed"}
					className={cn(
						"group peer hidden md:block text-gray-12",
						"transition-[width] duration-200 ease-linear",
						"w-0",
						state === "expanded" && "md:w-[--sidebar-width]",
						className
					)}
					ref={ref}
					{...props}
				>
					<div
						data-state={state}
						className={cn(
							"flex h-full w-full flex-col bg-gray-a1 border-r border-gray-a4",
							"group-data-[collapsible=offcanvas]:transition-[width]"
						)}
					>
						{children}
					</div>
				</div>

				{/* Mobile Overlay */}
				{openMobile && (
					<div
						className="fixed inset-0 z-50 bg-gray-a1/80 md:hidden"
						onClick={() => setOpenMobile(false)}
					/>
				)}

				{/* Mobile Sidebar */}
				<div
					data-state={openMobile ? "open" : "closed"}
					className={cn(
						"fixed inset-y-0 z-50 flex h-svh w-[--sidebar-width] flex-col border-r border-gray-a4 text-gray-12 transition-transform duration-200 ease-linear md:hidden",
						openMobile ? "translate-x-0" : "-translate-x-full"
					)}
					style={{ 
						backgroundColor: 'rgb(10, 10, 10)',
						backdropFilter: 'none'
					}}
				>
					{children}
				</div>
			</>
		);
	}
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentProps<typeof Slot>
>(({ className, onClick, ...props }, ref) => {
	const { toggleSidebar, setOpenMobile, openMobile } = useSidebar();

	return (
		<Slot
			ref={ref}
			className={cn("cursor-pointer", className)}
			onClick={(event) => {
				onClick?.(event);
				// On mobile, toggle mobile sidebar; on desktop, toggle desktop sidebar
				if (typeof window !== 'undefined' && window.innerWidth < 768) {
					setOpenMobile(!openMobile);
				} else {
					toggleSidebar();
				}
			}}
			{...props}
		>
			<PanelLeft />
		</Slot>
	);
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarRail = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			ref={ref}
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			className={cn(
				"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-gray-a4 after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100 group-data-[side=left]:-right-4 group-data-[side=right]:left-0 md:flex",
				"[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				className
			)}
			{...props}
		/>
	);
});
SidebarRail.displayName = "SidebarRail";

const SidebarInset = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<main
			ref={ref}
			className={cn(
				"relative flex min-h-svh flex-1 flex-col bg-gray-a1",
				"peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
				className
			)}
			{...props}
		/>
	);
});
SidebarInset.displayName = "SidebarInset";

const SidebarHeader = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-gray-a4 px-4", className)}
			{...props}
		/>
	);
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn("flex h-16 shrink-0 items-center gap-2 border-t border-gray-a4 px-4", className)}
			{...props}
		/>
	);
});
SidebarFooter.displayName = "SidebarFooter";

const SidebarContent = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn(
				"flex flex-1 flex-col gap-2 overflow-auto px-4 py-4 group-data-[collapsible=icon]:px-2",
				className
			)}
			{...props}
		/>
	);
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn("flex w-full min-w-0 flex-1 flex-col gap-2", className)}
			{...props}
		/>
	);
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn(
				"flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-gray-11 outline-none ring-sidebar-ring",
				className
			)}
			{...props}
		/>
	);
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentProps<typeof Slot> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
	return (
		<Slot
			ref={ref}
			{...(asChild ? { asChild: true } : {})}
			className={cn(
				"ml-auto shrink-0",
				className
			)}
			{...props}
		/>
	);
});
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn("flex w-full min-w-0 flex-1 flex-col gap-1", className)}
			{...props}
		/>
	);
});
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
	return (
		<ul
			ref={ref}
			className={cn("flex w-full min-w-0 flex-1 flex-col gap-1", className)}
			{...props}
		/>
	);
});
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
	return (
		<li
			ref={ref}
			className={cn("group/item relative", className)}
			{...props}
		/>
	);
});
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
	"peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-gray-a3 hover:text-gray-12 focus-visible:ring-2 active:bg-gray-a4 active:text-gray-12 disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-gray-a4 data-[active=true]:font-medium data-[active=true]:text-gray-12 data-[state=open]:hover:bg-gray-a3 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "hover:bg-gray-a3",
				outline:
					"bg-gray-a2 border border-gray-a4 hover:bg-gray-a3 hover:text-gray-12",
			},
			size: {
				default: "h-8 text-sm",
				sm: "h-7 text-xs",
				lg: "h-12 text-base group-data-[collapsible=icon]:!size-12",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

const SidebarMenuButton = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentProps<typeof Slot> &
		VariantProps<typeof sidebarMenuButtonVariants> & {
			asChild?: boolean;
			isActive?: boolean;
			tooltip?: string | React.ComponentProps<typeof TooltipPrimitive.Content>;
		}
>(
	(
		{
			asChild = false,
			variant = "default",
			size = "default",
			isActive = false,
			tooltip,
			className,
			...props
		},
		ref
	) => {
		const { state } = useSidebar();
		const button = (
			<Slot
				ref={ref}
				data-active={isActive}
				data-size={size}
				className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
				{...props}
			/>
		);

		if (!tooltip) {
			return button;
		}

		if (typeof tooltip === "string") {
			tooltip = {
				children: tooltip,
			};
		}

		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent
					side="right"
					align="center"
					hidden={state !== "collapsed"}
					{...tooltip}
				/>
			</Tooltip>
		);
	}
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentProps<typeof Slot> & {
		asChild?: boolean;
		showOnHover?: boolean;
	}
>(({ asChild = false, showOnHover = false, className, ...props }, ref) => {
	return (
		<Slot
			ref={ref}
			data-sidebar="menu-action"
			className={cn(
				"absolute right-1 top-1.5 flex h-5 w-5 items-center justify-center rounded-md p-0 text-gray-11 outline-none ring-sidebar-ring transition-transform hover:bg-gray-a3 hover:text-gray-12 peer-hover/menu-button:text-gray-11 focus-visible:ring-2 [&>svg]:size-3.5 [&>svg]:shrink-0",
				// Increases the hit area of the button on mobile.
				"after:absolute after:-inset-2",
				showOnHover &&
					"group-focus-within/item:opacity-100 group-hover/item:opacity-100 data-[state=open]:opacity-100 peer-data-[size=sm]/menu-button:top-1 md:opacity-0",
				className
			)}
			{...props}
		/>
	);
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn(
				"absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-gray-11 select-none pointer-events-none",
				"peer-hover/menu-button:text-gray-11 peer-data-[active=true]/menu-button:text-gray-12",
				"peer-data-[size=sm]/menu-button:text-[10px]",
				"group-data-[collapsible=icon]:hidden",
				className
			)}
			{...props}
		/>
	);
});
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		showIcon?: boolean;
	}
>(({ className, showIcon = false, ...props }, ref) => {
	// Random width between 50 to 90%.
	const width = React.useMemo(() => {
		return `${Math.floor(Math.random() * 40) + 50}%`;
	}, []);

	return (
		<div
			ref={ref}
			data-sidebar="menu-skeleton"
			className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
			{...props}
		>
			{showIcon && (
				<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-gray-a3" />
			)}
			<div
				className="h-4 flex-1 max-w-[--skeleton-width] rounded-md bg-gray-a3"
				style={
					{
						"--skeleton-width": width,
					} as React.CSSProperties
				}
			/>
		</div>
	);
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef<
	HTMLUListElement,
	React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
	return (
		<ul
			ref={ref}
			className={cn(
				"mx-3.5 flex min-w-0 flex-col gap-1 border-l border-gray-a4 px-2.5 py-0.5",
				className
			)}
			{...props}
		/>
	);
});
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<
	HTMLLIElement,
	React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
	return <li ref={ref} className={cn("", className)} {...props} />;
});
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentProps<typeof Slot> & {
		asChild?: boolean;
		isActive?: boolean;
		size?: "sm" | "lg" | "default";
	}
>(({ asChild = false, isActive, size = "default", className, ...props }, ref) => {
	return (
		<SidebarMenuButton
			ref={ref}
			asChild={asChild}
			data-active={isActive}
			size={size}
			variant="outline"
			className={cn("ml-3.5", className)}
			{...props}
		/>
	);
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

// Simple Tooltip components for sidebar
const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
	return <>{children}</>;
};

const Tooltip = ({ children }: { children: React.ReactNode }) => {
	return <>{children}</>;
};

const TooltipTrigger = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
	if (asChild && React.isValidElement(children)) {
		return React.cloneElement(children, { ...props } as any);
	}
	return <div ref={ref} {...props}>{children}</div>;
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		side?: "top" | "right" | "bottom" | "left";
		align?: "start" | "center" | "end";
		hidden?: boolean;
	}
>(({ children, hidden, className, ...props }, ref) => {
	if (hidden) return null;
	return (
		<div
			ref={ref}
			className={cn(
				"z-50 overflow-hidden rounded-md bg-gray-a4 px-3 py-1.5 text-xs text-gray-12 shadow-md",
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
});
TooltipContent.displayName = "TooltipContent";

const TooltipPrimitive = {
	Content: TooltipContent,
};

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
	useSidebar,
};

