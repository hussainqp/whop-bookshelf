// Predefined images available in the public folder
// Users can select from these images for backgrounds

export const PREDEFINED_SHELF_IMAGES = [
	{
		id: "shelf-default",
		name: "Default Shelf",
		url: "/shelf-background.png.png",
	},
	// Add more shelf images here as they are added to the public folder
	// Example:
	// {
	//   id: "shelf-wood",
	//   name: "Wood Shelf",
	//   url: "/shelves/wood-shelf.png",
	// },
];

export const PREDEFINED_EXPERIENCE_BACKGROUNDS = [
	{
		id: "bg-white",
		name: "White",
		url: "#ffffff",
		type: "color" as const,
	},
	{
		id: "bg-black",
		name: "Black",
		url: "#000000",
		type: "color" as const,
	},
	{
		id: "bg-gray",
		name: "Light Gray",
		url: "#f5f5f5",
		type: "color" as const,
	},
	// Add more background images here as they are added to the public folder
	// Example:
	// {
	//   id: "bg-library",
	//   name: "Library Background",
	//   url: "/backgrounds/library-bg.jpg",
	//   type: "image" as const,
	// },
];

