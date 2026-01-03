"use client";

import { Button } from "@whop/react/components";
import { useIframeSdk } from "@whop/react";

interface AddBookButtonProps {
	companyId: string;
}

export default function AddBookButton({ companyId }: AddBookButtonProps) {
	const iframeSdk = useIframeSdk();

	function handleClick() {
		iframeSdk.openExternalUrl({ 
			url: `https://whop.com/dashboard/${companyId}/apps/app_ESUHD19IZeASks/` 
		});
	}

	return (
		<Button variant="classic" size="3" onClick={handleClick}>
			Add Book
		</Button>
	);
}
