"use client";

import { useState } from "react";
import { Button } from "@whop/react/components";
import AddBookInstructionsModal from "./AddBookInstructionsModal";

export default function AddBookButton() {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<Button variant="classic" size="3" onClick={() => setIsModalOpen(true)}>
				Add Book
			</Button>
			<AddBookInstructionsModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</>
	);
}

