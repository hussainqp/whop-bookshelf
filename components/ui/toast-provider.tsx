'use client';

import * as React from 'react';
import { Toast } from './toast';

interface ToastContextType {
	showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toast, setToast] = React.useState<{
		message: string;
		type: 'error' | 'success' | 'info';
	} | null>(null);

	const showToast = React.useCallback(
		(message: string, type: 'error' | 'success' | 'info' = 'error') => {
			setToast({ message, type });
		},
		[]
	);

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					onClose={() => setToast(null)}
				/>
			)}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = React.useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within ToastProvider');
	}
	return context;
}

