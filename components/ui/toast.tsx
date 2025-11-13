'use client';

import * as React from 'react';
import { X } from 'lucide-react';

interface ToastProps {
	message: string;
	type?: 'error' | 'success' | 'info';
	onClose: () => void;
}

export function Toast({ message, type = 'error', onClose }: ToastProps) {
	React.useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, 5000);

		return () => clearTimeout(timer);
	}, [onClose]);

	const bgColor =
		type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600';

	return (
		<div
			className={`fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg ${bgColor} px-4 py-3 text-white shadow-2xl min-w-[300px] max-w-md border border-white/30 backdrop-blur-0`}
			style={{ 
				opacity: 1,
				backgroundColor: type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'
			}}
		>
			<span className="flex-1 text-sm font-medium text-white">{message}</span>
			<button
				onClick={onClose}
				className="shrink-0 rounded-md p-1 hover:bg-black/20 transition-colors"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}

