import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;


export function getPlaceholderImage(id: string): ImagePlaceholder | undefined {
    return PlaceHolderImages.find(img => img.id === id);
}

// Function to generate a unique but consistent avatar URL for a borrower
export function getBorrowerAvatar(borrowerId: string): string {
    // This simple hashing function will create a somewhat unique seed from the borrowerId
    const seed = borrowerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${seed}/100/100`;
}
