"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";

interface AdminRedirectModalProps {
	companyId: string;
}

export default function AdminRedirectModal({ companyId }: AdminRedirectModalProps) {
	const [open, setOpen] = useState(true);
	const router = useRouter();

	const handleRedirect = () => {
		router.push(`/dashboard/${companyId}/add`);
	};

	const handleStay = () => {
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Admin Dashboard</DialogTitle>
					<DialogDescription>
						You're logged in as an admin. Would you like to go to the dashboard to manage your books?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex gap-2 sm:gap-0">
					<button
						onClick={handleStay}
						className="px-4 py-2 text-sm font-medium text-gray-11 bg-gray-a3 hover:bg-gray-a4 rounded-md transition-colors"
					>
						Stay Here
					</button>
					<button
						onClick={handleRedirect}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
					>
						Go to Dashboard
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

