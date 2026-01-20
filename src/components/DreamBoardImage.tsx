import React from 'react';

// Helper component for displaying dream board images (handling bucket paths vs public URLs)
export default function DreamBoardImage({
    imagePath,
    alt,
    getImageUrl,
    className
}: {
    imagePath: string;
    alt: string;
    getImageUrl: (path: string) => Promise<string | null>;
    className?: string;
}) {
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadImage = async () => {
            const url = await getImageUrl(imagePath);
            setImageUrl(url);
            setLoading(false);
        };
        loadImage();
    }, [imagePath, getImageUrl]);

    if (loading) {
        return <div className={`flex items-center justify-center bg-muted/20 ${className}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    if (!imageUrl) {
        return <div className={`flex items-center justify-center bg-muted/20 text-muted-foreground ${className}`}>Erro ao carregar imagem</div>;
    }

    return (
        <img
            src={imageUrl}
            alt={alt}
            className={className}
        />
    );
}
