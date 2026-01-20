import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Connection,
    Edge,
    Node,
    Viewport,
    ReactFlowProvider,
    useReactFlow,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Download, Plus, ArrowLeft, Type, Square, Circle, Trash2, Palette, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MindMap } from '@/hooks/useMindMaps';

// Custom Node Colors
const NODE_COLORS = [
    { name: 'Branco', value: '#ffffff', text: '#000000' },
    { name: 'Azul Claro', value: '#e0f2fe', text: '#000000' },
    { name: 'Verde Claro', value: '#dcfce7', text: '#000000' },
    { name: 'Amarelo', value: '#fef9c3', text: '#000000' },
    { name: 'Vermelho Claro', value: '#fee2e2', text: '#000000' },
    { name: 'Roxo Claro', value: '#f3e8ff', text: '#000000' },
    { name: 'Cinza', value: '#f3f4f6', text: '#000000' },
    { name: 'Preto', value: '#1f2937', text: '#ffffff' },
];

// Level Styles
const getLevelStyle = (level: number) => {
    switch (level) {
        case 0: // Main Topic
            return {
                fontSize: '24px',
                fontWeight: 'bold',
                padding: '20px 40px',
                borderWidth: '3px',
                borderRadius: '12px',
                width: 250,
            };
        case 1: // Direct Subtopic
            return {
                fontSize: '18px',
                fontWeight: '600',
                padding: '15px 30px',
                borderWidth: '2px',
                borderRadius: '10px',
                width: 200,
            };
        case 2: // Level 2
            return {
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 24px',
                borderWidth: '1px',
                borderRadius: '8px',
                width: 160,
            };
        default: // Deeper levels
            return {
                fontSize: '14px',
                fontWeight: 'normal',
                padding: '10px 20px',
                borderWidth: '1px',
                borderRadius: '6px',
                width: 140,
            };
    }
};

interface MindMapEditorProps {
    initialMap?: MindMap;
    onSave: (mapData: { title: string; nodes: Node[]; edges: Edge[]; viewport: Viewport }) => Promise<void>;
    onBack: () => void;
}

function MindMapEditorContent({ initialMap, onSave, onBack }: MindMapEditorProps) {
    const [title, setTitle] = useState(initialMap?.title || 'Novo Mapa Mental');
    const [nodes, setNodes, onNodesChange] = useNodesState(initialMap?.nodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialMap?.edges || []);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { getViewport, project } = useReactFlow();

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
        [setEdges],
    );

    const addNode = (parentId?: string) => {
        const id = `node_${Date.now()}`;
        const viewport = getViewport();

        let position = {
            x: (-viewport.x + 400) / viewport.zoom,
            y: (-viewport.y + 300) / viewport.zoom,
        };

        let level = 0;
        let label = 'Novo Tópico';

        if (parentId) {
            const parent = nodes.find(n => n.id === parentId);
            if (parent) {
                level = (parent.data.level ?? 0) + 1;
                // Basic auto-layout attempt: stagger right and down/up
                position = {
                    x: parent.position.x + 300,
                    y: parent.position.y + (Math.random() * 200 - 100)
                };
                label = `Subtópico`;
            }
        }

        const levelStyle = getLevelStyle(level);

        const newNode: Node = {
            id,
            position,
            data: { label, level },
            style: {
                background: '#ffffff',
                border: '1px solid #777',
                textAlign: 'center',
                ...levelStyle
            },
        };
        setNodes((nds) => nds.concat(newNode));

        if (parentId) {
            const newEdge: Edge = {
                id: `e-${parentId}-${id}`,
                source: parentId,
                target: id,
                type: 'smoothstep',
                animated: true,
                style: { strokeWidth: Math.max(1, 3 - level) }
            };
            setEdges((eds) => eds.concat(newEdge));
        }
    };

    const updateNodeLabel = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedNodeId) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNodeId) {
                    return { ...node, data: { ...node.data, label: evt.target.value } };
                }
                return node;
            })
        );
    };

    const updateNodeColor = (colorBg: string, colorText: string) => {
        if (!selectedNodeId) return;
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNodeId) {
                    return {
                        ...node,
                        style: { ...node.style, background: colorBg, color: colorText }
                    };
                }
                return node;
            })
        );
    };

    const handleSave = async () => {
        const viewport = getViewport();
        await onSave({
            title,
            nodes,
            edges,
            viewport
        });
    };

    const handleExportPDF = async () => {
        if (!reactFlowWrapper.current) return;

        try {
            toast({
                title: "Gerando PDF...",
                description: "Aguarde enquanto preparamos o documento.",
            });

            // Capture the flow
            const canvas = await html2canvas(reactFlowWrapper.current, {
                ignoreElements: (element) => {
                    const className = element.className;
                    if (typeof className === 'string') {
                        return className.includes('react-flow__controls') || className.includes('react-flow__panel') || className.includes('react-flow__minimap');
                    }
                    return false;
                }
            });
            const imgData = canvas.toDataURL('image/png');

            const { PdfService } = await import('@/lib/pdf-service');
            const pdf = new PdfService();
            await pdf.initialize('Mapa Mental');

            pdf.addSubtitle(`${title} • Gerado em ${new Date().toLocaleDateString('pt-BR')}`);

            // Calculate dimensions to fit image on page
            const imgProps = pdf.getDoc().getImageProperties(imgData);
            const pdfWidth = pdf.getContentWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Add image
            // Note: raw addImage usage via getDoc() until PdfService wraps it
            pdf.getDoc().addImage(imgData, 'PNG', pdf.getMargin(), pdf.getCurrentY(), pdfWidth, pdfHeight);

            pdf.save(`mapa-mental-${title.toLowerCase().replace(/\s/g, '-')}`);

            toast({
                title: "PDF Exportado!",
                description: "O arquivo foi baixado com sucesso.",
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
            toast({
                title: "Erro ao exportar",
                description: "Não foi possível gerar o PDF.",
                variant: "destructive"
            });
        }
    };

    // Selection handling
    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (nodes.length > 0) {
            setSelectedNodeId(nodes[0].id);
        } else {
            setSelectedNodeId(null);
        }
    }, []);

    // Update selected value input when selection changes
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] w-full bg-background border rounded-lg overflow-hidden animate-in fade-in duration-300">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="font-bold text-lg h-auto border-transparent hover:border-input focus:border-input w-[300px]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportPDF}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar PDF
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onSelectionChange={onSelectionChange}
                    defaultViewport={initialMap?.viewport || { x: 0, y: 0, zoom: 1 }}
                    minZoom={0.2}
                    maxZoom={4}
                    fitView={!initialMap}
                    className="bg-slate-50 dark:bg-slate-900"
                >
                    <Controls />
                    <MiniMap />
                    <Background gap={12} size={1} />

                    <Panel position="top-left" className="bg-background/90 p-2 rounded-lg border shadow-sm backdrop-blur-sm gap-2 flex flex-col w-[200px]">
                        <Button onClick={() => addNode()} variant="secondary" size="sm" className="w-full justify-start">
                            <Plus className="w-4 h-4 mr-2" /> Tópico Principal
                        </Button>

                        {selectedNode && (
                            <div className="space-y-3 pt-2 border-t mt-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Editar Seleção</span>

                                <Button
                                    onClick={() => addNode(selectedNodeId!)}
                                    variant="default"
                                    size="sm"
                                    className="w-full justify-start bg-primary/90 hover:bg-primary"
                                >
                                    <BrainCircuit className="w-4 h-4 mr-2" /> Adicionar Subtópico
                                </Button>

                                <Input
                                    value={selectedNode.data.label}
                                    onChange={updateNodeLabel}
                                    placeholder="Texto do tópico"
                                    className="h-8 text-xs"
                                />
                                <div className="grid grid-cols-4 gap-1">
                                    {NODE_COLORS.map(c => (
                                        <button
                                            key={c.name}
                                            className="w-8 h-8 rounded border ring-offset-background hover:ring-2 hover:ring-ring transition-all"
                                            style={{ backgroundColor: c.value }}
                                            onClick={() => updateNodeColor(c.value, c.text)}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full h-8"
                                    onClick={() => {
                                        setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
                                        setSelectedNodeId(null);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3 mr-2" /> Excluir
                                </Button>
                            </div>
                        )}
                        {!selectedNode && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                Selecione um item para editar
                            </p>
                        )}
                    </Panel>
                </ReactFlow>
            </div>
        </div>
    );
}

export default function MindMapEditor(props: MindMapEditorProps) {
    return (
        <ReactFlowProvider>
            <MindMapEditorContent {...props} />
        </ReactFlowProvider>
    );
}
