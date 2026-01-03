'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
	rating: number | null;
	onRatingChange: (rating: number) => void;
	disabled?: boolean;
}

export function StarRating({ rating, onRatingChange, disabled = false }: StarRatingProps) {
	const [hoveredRating, setHoveredRating] = useState<number | null>(null);

	const handleClick = (value: number) => {
		if (!disabled) {
			onRatingChange(value);
		}
	};

	const handleMouseEnter = (value: number) => {
		if (!disabled) {
			setHoveredRating(value);
		}
	};

	const handleMouseLeave = () => {
		if (!disabled) {
			setHoveredRating(null);
		}
	};

	const displayRating = hoveredRating ?? rating ?? 0;

	return (
		<div className="flex items-center gap-1">
			{[1, 2, 3, 4, 5].map((value) => {
				const isFilled = value <= displayRating;
				return (
					<button
						key={value}
						type="button"
						onClick={() => handleClick(value)}
						onMouseEnter={() => handleMouseEnter(value)}
						onMouseLeave={handleMouseLeave}
						disabled={disabled}
						className={`transition-all ${
							disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
						}`}
					>
						<Star
							fill={isFilled ? 'currentColor' : 'none'}
							className={`h-8 w-8 transition-colors ${
								isFilled
									? 'text-yellow-500'
									: 'text-gray-300'
							}`}
						/>
					</button>
				);
			})}
		</div>
	);
}

