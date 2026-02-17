import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flashcard } from '@/lib/types';
import { useFlashcardImages } from '@/hooks/useFlashcardImages';
import { Calendar, Image as ImageIcon } from 'lucide-react';

interface FlashcardDetailDialogProps {
    flashcard: Flashcard | null;
    open: boolean;
    onClose: () => void;
}

// Helper component for displaying flashcard images
function FlashcardImage({ imagePath, getImageUrl }: { imagePath: string; getImageUrl: (path: string) => Promise<string | null> }) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            const url = await getImageUrl(imagePath);
            setImageUrl(url);
            setLoading(false);
        };
        loadImage();
    }, [imagePath, getImageUrl]);

    if (loading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Carregando imagem...</div>;
    }

    if (!imageUrl) {
        return null;
    }

    return (
        <img
            src={imageUrl}
            alt="Flashcard"
            className="max-w-full max-h-64 rounded border mt-3 mx-auto"
        />
    );
}

export function FlashcardDetailDialog({ flashcard, open, onClose }: FlashcardDetailDialogProps) {
    const { getImageUrl } = useFlashcardImages();

    if (!flashcard) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Visualizar Flashcard</span>
                        <Badge variant="outline">{flashcard.area}</Badge>
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                    <div className="space-y-6">
                        {/* Front Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    📌
                                </div>
                                FRENTE (Pergunta)
                            </div>
                            <div className="bg-muted/30 rounded-lg p-4 border">
                                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                                    {flashcard.front}
                                </p>
                                {flashcard.front_image_url && (
                                    <div className="mt-3 flex justify-center">
                                        <FlashcardImage imagePath={flashcard.front_image_url} getImageUrl={getImageUrl} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Back Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    🔄
                                </div>
                                VERSO (Resposta)
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                                    {flashcard.back}
                                </p>
                                {flashcard.answer_image_url && (
                                    <div className="mt-3 flex justify-center">
                                        <FlashcardImage imagePath={flashcard.answer_image_url} getImageUrl={getImageUrl} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Criado em: {new Date(flashcard.created_at || '').toLocaleDateString('pt-BR')}</span>
                            </div>
                            {(flashcard.front_image_url || flashcard.answer_image_url) && (
                                <div className="flex items-center gap-1.5">
                                    <ImageIcon className="w-4 h-4" />
                                    <span>
                                        {flashcard.front_image_url && flashcard.answer_image_url
                                            ? 'Contém 2 imagens'
                                            : 'Contém 1 imagem'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
