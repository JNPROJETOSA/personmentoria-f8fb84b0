// Helper component for displaying flashcard images in study mode
function FlashcardImage({ imagePath, getImageUrl }: { imagePath: string; getImageUrl: (path: string) => Promise<string | null> }) {
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
        return <div className="text-sm">Carregando imagem...</div>;
    }

    if (!imageUrl) {
        return null;
    }

    return (
        <img
            src={imageUrl}
            alt="Flashcard answer"
            className="max-w-full max-h-48 rounded border mt-2"
        />
    );
}
