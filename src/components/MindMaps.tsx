import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Plus, Folder, Map as MapIcon, Loader2, Search, Trash, ArrowLeft, FolderOpen, MoreVertical, FolderInput } from 'lucide-react';
import { MedicalArea } from '@/lib/types';
import { AREA_COLORS } from '@/lib/constants';
import { useMindMaps, MindMap, MindMapFolder } from '@/hooks/useMindMaps';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MindMapEditor from './MindMapEditor';

export default function MindMaps({ userId }: { userId?: string }) {
    const { folders, maps, loading, createFolder, saveMap, deleteItem, moveMap, refresh } = useMindMaps(userId);
    const [selectedArea, setSelectedArea] = useState<MedicalArea | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMap, setActiveMap] = useState<MindMap | null>(null);
    const [currentFolder, setCurrentFolder] = useState<MindMapFolder | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Dialogs
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderArea, setNewFolderArea] = useState<MedicalArea>(MedicalArea.CLINICA);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'folder' | 'map', name: string } | null>(null);

    // Filtering logic
    const filteredFolders = useMemo(() => {
        // If inside a folder, we don't show sub-folders (system is 1 level deep for now)
        if (currentFolder) return [];

        return folders.filter(f =>
            (selectedArea === 'ALL' || f.area === selectedArea) &&
            (f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [folders, selectedArea, searchQuery, currentFolder]);

    const filteredMaps = useMemo(() => {
        return maps.filter(m => {
            // Search override: if searching, show all matches regardless of folder
            if (searchQuery) {
                return (selectedArea === 'ALL' || m.area === selectedArea) &&
                    m.title.toLowerCase().includes(searchQuery.toLowerCase());
            }

            // Normal navigation:
            // If in folder -> show maps with that folderId
            // If at root -> show maps with NO folderId
            const matchesFolder = currentFolder ? m.folderId === currentFolder.id : !m.folderId;
            const matchesArea = selectedArea === 'ALL' || m.area === selectedArea;

            return matchesFolder && matchesArea;
        });
    }, [maps, selectedArea, searchQuery, currentFolder]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        // Default area to the currently selected tab if not ALL, otherwise use what was picked
        const areaToUse = selectedArea !== 'ALL' ? selectedArea : newFolderArea;
        await createFolder(newFolderName, areaToUse);
        setNewFolderName('');
        setNewFolderDialog(false);
    };

    const handleOpenMap = (map: MindMap) => {
        setActiveMap(map);
        setIsEditorOpen(true);
    };

    const handleCreateMap = () => {
        setActiveMap(null); // New map
        setIsEditorOpen(true);
    };

    const handleSaveMap = async (data: any) => {
        // If editing existing, keep its area. If new, use current folder area or selected tab area.
        let areaToSave = activeMap?.area;
        if (!areaToSave) {
            if (currentFolder) areaToSave = currentFolder.area;
            else if (selectedArea !== 'ALL') areaToSave = selectedArea;
            else areaToSave = MedicalArea.CLINICA;
        }

        // If editing, keep folderId. If new, use currentFolder.id
        const folderIdToSave = activeMap ? activeMap.folderId : currentFolder?.id;

        const mapPayload = {
            title: data.title,
            area: areaToSave,
            folderId: folderIdToSave,
            nodes: data.nodes,
            edges: data.edges,
            viewport: data.viewport
        };

        await saveMap(mapPayload, activeMap?.id);
        await refresh();
        if (!activeMap) {
            setIsEditorOpen(false);
        }
    };

    const handleMoveMap = async (map: MindMap, targetFolderId: string | null) => {
        await moveMap(map.id, targetFolderId);
    };

    if (isEditorOpen) {
        return (
            <MindMapEditor
                initialMap={activeMap || undefined}
                onBack={() => setIsEditorOpen(false)}
                onSave={handleSaveMap}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                Mapas Mentais
                            </CardTitle>
                            <CardDescription>
                                Crie e organize seus mapas mentais.
                            </CardDescription>
                        </div>
                        {currentFolder && (
                            <Button variant="ghost" onClick={() => setCurrentFolder(null)}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar para Raiz
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                        <div className="flex gap-2 items-center flex-1 w-full md:w-auto">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar mapas ou pastas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                        <div className="flex gap-2">
                            {!currentFolder && (
                                <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <Folder className="w-4 h-4 mr-2" />
                                            Nova Pasta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Nova Pasta</DialogTitle>
                                            <DialogDescription>Crie uma pasta para organizar seus mapas.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Nome da Pasta</Label>
                                                <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Ex: Cardiologia" />
                                            </div>
                                            {selectedArea === 'ALL' && (
                                                <div className="space-y-2">
                                                    <Label>Área Médica</Label>
                                                    <select
                                                        className="w-full p-2 border rounded-md bg-background"
                                                        value={newFolderArea}
                                                        onChange={e => setNewFolderArea(e.target.value as MedicalArea)}
                                                    >
                                                        {Object.values(MedicalArea).map(area => (
                                                            <option key={area} value={area}>{area}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleCreateFolder}>Criar Pasta</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}

                            <Button onClick={handleCreateMap}>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Mapa {currentFolder ? `em ${currentFolder.name}` : ''}
                            </Button>
                        </div>
                    </div>

                    {/* Breadcrumbs / Current Folder Indicator */}
                    {currentFolder && (
                        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                            <FolderOpen className="w-4 h-4" />
                            <span>{currentFolder.area}</span>
                            <span>/</span>
                            <span className="font-semibold text-foreground">{currentFolder.name}</span>
                        </div>
                    )}

                    {/* Area Tabs (Only show if at root and not searching) */}
                    {!currentFolder && (
                        <Tabs defaultValue="ALL" onValueChange={(v) => setSelectedArea(v as MedicalArea | 'ALL')} className="space-y-6">
                            <TabsList className="flex flex-wrap h-auto p-1 gap-1 bg-muted/50">
                                <TabsTrigger value="ALL" className="flex-1 min-w-[100px]">Todas</TabsTrigger>
                                {Object.values(MedicalArea).map(area => (
                                    <TabsTrigger
                                        key={area}
                                        value={area}
                                        className="flex-1 min-w-[100px]"
                                        style={{
                                            borderColor: selectedArea === area ? AREA_COLORS[area] : 'transparent',
                                            borderBottomWidth: selectedArea === area ? 2 : 0
                                        }}
                                    >
                                        {area.split(' ')[0]}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    )}

                    <div className="mt-6 space-y-8">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                {/* Folders Section */}
                                {filteredFolders.length > 0 && !currentFolder && !searchQuery && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <Folder className="w-4 h-4" /> Pastas
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {filteredFolders.map(folder => (
                                                <div
                                                    key={folder.id}
                                                    className="group relative flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                                    onClick={() => setCurrentFolder(folder)}
                                                >
                                                    <Folder className="w-8 h-8 text-yellow-500 fill-yellow-500/20" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{folder.name}</p>
                                                        <p className="text-xs text-muted-foreground">{folder.area}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: folder.id, type: 'folder', name: folder.name }); }}
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Maps Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <MapIcon className="w-4 h-4" />
                                        {currentFolder ? `Mapas em ${currentFolder.name}` : 'Mapas'}
                                    </h3>
                                    {filteredMaps.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>Nenhum mapa encontrado.</p>
                                            <Button variant="link" onClick={handleCreateMap} className="mt-2">
                                                Criar novo mapa
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filteredMaps.map(map => (
                                                <div
                                                    key={map.id}
                                                    className="group relative flex flex-col p-4 rounded-lg border bg-card hover:border-primary/50 transition-all cursor-pointer h-[160px] shadow-sm"
                                                    onClick={() => handleOpenMap(map)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: AREA_COLORS[map.area] }} />
                                                            <span className="text-xs text-muted-foreground">{map.area}</span>
                                                            {map.folderId && !currentFolder && (
                                                                <span className="text-xs text-muted-foreground bg-muted px-1 rounded flex items-center gap-1">
                                                                    <Folder className="w-3 h-3" />
                                                                    {folders.find(f => f.id === map.folderId)?.name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: map.id, type: 'map', name: map.title }); }} className="text-destructive focus:text-destructive">
                                                                    <Trash className="w-4 h-4 mr-2" /> Excluir
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuLabel>Mover para...</DropdownMenuLabel>
                                                                {/* Move to Root Option */}
                                                                {map.folderId && (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveMap(map, null); }}>
                                                                        <FolderInput className="w-4 h-4 mr-2" /> Raiz (Sem pasta)
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {/* Move to Folder Options */}
                                                                {folders
                                                                    .filter(f => f.id !== map.folderId && (f.area === map.area)) // Only allow moving to folders of same area? Or allow all? Allowing all gives flexibility. Let's filter only not current. Use same area is safer for strictness but user might want flexibility. Let's stick to SAME AREA for now to avoid confusion.
                                                                    .map(f => (
                                                                        <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); handleMoveMap(map, f.id); }}>
                                                                            <Folder className="w-4 h-4 mr-2" /> {f.name}
                                                                        </DropdownMenuItem>
                                                                    ))
                                                                }
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <h4 className="font-semibold text-lg mb-1 line-clamp-2 leading-tight">{map.title}</h4>

                                                    <div className="mt-auto pt-2 border-t border-dashed flex justify-between items-center text-xs text-muted-foreground">
                                                        <span>{new Date(map.updatedAt).toLocaleDateString()}</span>
                                                        <span>{map.nodes?.length || 0} tópicos</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a excluir <strong>{deleteTarget?.name}</strong>.
                            {deleteTarget?.type === 'folder' && " Todos os mapas dentro desta pasta também serão excluídos."}
                            <br />
                            Essa ação é irreversível.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteTarget) {
                                    deleteItem(deleteTarget.id, deleteTarget.type);
                                    setDeleteTarget(null);
                                }
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
