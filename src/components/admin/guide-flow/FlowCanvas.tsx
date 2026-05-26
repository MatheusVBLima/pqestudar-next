import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2 } from 'lucide-react';

import { InputNode } from './flow-nodes/InputNode';
import { MetaNode } from './flow-nodes/MetaNode';
import { SeoNode } from './flow-nodes/SeoNode';
import { ContentNode } from './flow-nodes/ContentNode';
import { CtaNode } from './flow-nodes/CtaNode';
import { LinksNode } from './flow-nodes/LinksNode';
import { IntegrityNode } from './flow-nodes/IntegrityNode';
import { SourcesNode } from './flow-nodes/SourcesNode';
import { ImageNode } from './flow-nodes/ImageNode';
import { NodeEditorSheet } from './NodeEditorSheet';
import { ImagePromptEditor } from './ImagePromptEditor';
import type { GeneratedGuideData } from './GuideFlowPreview';
import type { GuideFlowInputs } from './GuideFlowForm';
import type { GuideFlowSources } from '@/hooks/useGuideFlowSources';

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  metaNode: MetaNode,
  seoNode: SeoNode,
  contentNode: ContentNode,
  ctaNode: CtaNode,
  linksNode: LinksNode,
  integrityNode: IntegrityNode,
  sourcesNode: SourcesNode,
  imageNode: ImageNode,
};

const NODE_W = 320;
const GAP_X = 80;
const GAP_Y = 60;
const START_X = 60;
const START_Y = 60;

type FlowNodeData = Record<string, unknown>;

interface EditorNodeData {
  nodeType: 'meta' | 'seo' | 'content' | 'cta' | 'links';
  nodeId: string;
  label: string;
  sectionIndex?: number;
}

function buildInitialNodes(): Node[] {
  return [
    {
      id: 'sources',
      type: 'sourcesNode',
      position: { x: START_X, y: START_Y },
      data: {},
    },
    {
      id: 'input',
      type: 'inputNode',
      position: { x: START_X + NODE_W + GAP_X + 40, y: START_Y + 40 },
      data: {},
    },
  ];
}

function buildInitialEdges(): Edge[] {
  return [
    {
      id: 'e-sources-input',
      source: 'sources',
      target: 'input',
      animated: true,
      style: { stroke: 'hsl(var(--primary) / 0.4)' },
    },
  ];
}

export function buildGeneratedLayout(data: GeneratedGuideData, structureNames: string[], libraryName: string | null, onRegenerateImage?: (prompt: string, position: string) => void, onEditPrompt?: (position: string) => void): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const col = 0;

  const addNode = (id: string, type: string, nodeData: FlowNodeData, c?: number, r?: number) => {
    const x = START_X + (c ?? col) * (NODE_W + GAP_X);
    const y = START_Y + (r ?? 0) * (280 + GAP_Y);
    nodes.push({ id, type, position: { x, y }, data: nodeData });
  };

  // Column 0: Meta + SEO
  addNode('meta', 'metaNode', {
    title: data.title, slug: data.slug, category: data.category,
    author_name: data.author_name, short_description: data.short_description,
  }, 0, 0);

  addNode('seo', 'seoNode', {
    seo_title: data.seo_title, seo_description: data.seo_description,
  }, 0, 1);

  // Cover image node (column 0, row 2) — always show if prompt exists
  // Merge: generated_images override image_prompts by position
  const imagePrompts = data.image_prompts ?? [];
  const generatedMap = new Map((data.generated_images ?? []).map(img => [img.position, img]));
  const images = imagePrompts.map(ip => {
    const generated = generatedMap.get(ip.position);
    return generated ? { ...ip, ...generated } : { ...ip, status: ip.status ?? 'pending' as const };
  });
  // Add any generated images that weren't in prompts
  for (const gi of (data.generated_images ?? [])) {
    if (!imagePrompts.find(ip => ip.position === gi.position)) {
      images.push(gi);
    }
  }

  const coverImage = images.find(img => img.type === 'cover');
  if (coverImage) {
    addNode('img-cover', 'imageNode', {
      ...coverImage,
      onRegenerate: onRegenerateImage,
      onEditPrompt,
    }, 0, 2);
    edges.push({ id: 'e-seo-imgcover', source: 'seo', target: 'img-cover', style: { stroke: 'hsl(var(--primary) / 0.3)' } });
  }

  // Column 1: Content sections
  const lines = data.content_markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (text) sections.push({ title: currentTitle || 'Introdução', content: text });
    currentLines = [];
  };

  for (const line of lines) {
    if (/^## /.test(line)) {
      flush();
      currentTitle = line.replace(/^##\s*\*?\*?/, '').replace(/\*?\*?\s*$/, '').trim();
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }
  flush();

  // Internal images mapped by position
  const internalImages = images.filter(img => img.type === 'internal');

  sections.forEach((sec, i) => {
    addNode(`section-${i}`, 'contentNode', { label: sec.title, content: sec.content, sectionIndex: i }, 1, i);

    // Check if there's an internal image for after this section
    const imgForSection = internalImages.find(img => img.position === `after_section_${i}`);
    if (imgForSection) {
      const imgRow = i + 0.6; // Offset slightly
      const imgX = START_X + 1 * (NODE_W + GAP_X) + NODE_W + 20;
      const imgY = START_Y + imgRow * (280 + GAP_Y);
      const imgId = `img-section-${i}`;
      nodes.push({
        id: imgId,
        type: 'imageNode',
        position: { x: imgX, y: imgY },
        data: { ...imgForSection, onRegenerate: onRegenerateImage, onEditPrompt },
      });
      edges.push({
        id: `e-s${i}-img${i}`,
        source: `section-${i}`,
        target: imgId,
        style: { stroke: 'hsl(var(--primary) / 0.2)', strokeDasharray: '4 4' },
      });
    }
  });

  // Column 2 (shifted to 3 if images exist): CTAs + Links
  const ctaCol = internalImages.length > 0 ? 3 : 2;
  let ctaRow = 0;
  if (data.cta_top) addNode('cta_top', 'ctaNode', { ...data.cta_top, ctaType: 'Superior' }, ctaCol, ctaRow++);
  if (data.cta_middle) addNode('cta_middle', 'ctaNode', { ...data.cta_middle, ctaType: 'Intermediária' }, ctaCol, ctaRow++);
  if (data.cta_final) addNode('cta_final', 'ctaNode', { ...data.cta_final, ctaType: 'Final' }, ctaCol, ctaRow++);
  if (data.internal_links.length > 0) addNode('links', 'linksNode', { links: data.internal_links }, ctaCol, ctaRow++);

  // Integrity panel
  const integrityCol = ctaCol + 1;
  addNode('integrity', 'integrityNode', {
    guideData: data,
    structureFileNames: structureNames,
    hasLibrary: !!libraryName,
    libraryName,
  }, integrityCol, 0);

  // Edges
  edges.push({ id: 'e-meta-seo', source: 'meta', target: 'seo', animated: true, style: { stroke: 'hsl(var(--primary))' } });

  if (sections.length > 0) {
    edges.push({ id: 'e-meta-s0', source: 'meta', target: 'section-0', animated: true, style: { stroke: 'hsl(var(--primary))' } });
    for (let i = 0; i < sections.length - 1; i++) {
      edges.push({ id: `e-s${i}-s${i + 1}`, source: `section-${i}`, target: `section-${i + 1}`, style: { stroke: 'hsl(var(--primary) / 0.4)' } });
    }
  }

  if (data.cta_top && sections.length > 0) edges.push({ id: 'e-s0-ctatop', source: 'section-0', target: 'cta_top', style: { stroke: 'hsl(var(--accent-foreground) / 0.3)' } });
  const midSection = Math.floor(sections.length / 2);
  if (data.cta_middle && sections.length > midSection) edges.push({ id: 'e-smid-ctamid', source: `section-${midSection}`, target: 'cta_middle', style: { stroke: 'hsl(var(--accent-foreground) / 0.3)' } });
  if (data.cta_final && sections.length > 0) edges.push({ id: 'e-slast-ctafinal', source: `section-${sections.length - 1}`, target: 'cta_final', style: { stroke: 'hsl(var(--accent-foreground) / 0.3)' } });

  if (data.internal_links.length > 0) {
    const lastCta = data.cta_final ? 'cta_final' : data.cta_middle ? 'cta_middle' : data.cta_top ? 'cta_top' : null;
    if (lastCta) edges.push({ id: 'e-cta-links', source: lastCta, target: 'links', style: { stroke: 'hsl(var(--accent-foreground) / 0.3)' } });
  }

  edges.push({ id: 'e-meta-integrity', source: 'meta', target: 'integrity', animated: true, style: { stroke: 'hsl(var(--primary) / 0.2)', strokeDasharray: '5 5' } });

  return { nodes, edges };
}

// Map a clicked node to the editor data shape
function nodeToEditorData(nodeId: string, nodeType: string, nodeData: Record<string, unknown>): EditorNodeData | null {
  switch (nodeType) {
    case 'metaNode':
      return { nodeType: 'meta', nodeId, label: 'Metadados' };
    case 'seoNode':
      return { nodeType: 'seo', nodeId, label: 'SEO' };
    case 'contentNode':
      return {
        nodeType: 'content',
        nodeId,
        label: typeof nodeData.label === 'string' ? nodeData.label : 'Seção',
        sectionIndex: typeof nodeData.sectionIndex === 'number' ? nodeData.sectionIndex : 0,
      };
    case 'ctaNode':
      return { nodeType: 'cta', nodeId, label: `CTA ${typeof nodeData.ctaType === 'string' ? nodeData.ctaType : ''}` };
    case 'linksNode':
      return { nodeType: 'links', nodeId, label: 'Links Internos' };
    default:
      return null;
  }
}

interface FlowCanvasProps {
  guideData: GeneratedGuideData | null;
  isGenerating: boolean;
  onGenerate: (inputs: GuideFlowInputs) => void;
  onGuideDataChange: (data: GeneratedGuideData) => void;
  sources: GuideFlowSources;
  onInputsChange?: (inputs: GuideFlowInputs) => void;
  onTargetTypeChange?: (targetType: GuideFlowInputs['targetType']) => void;
  onRegenerateImage?: (prompt: string, position: string) => void;
  onUpdateImagePrompt?: (position: string, newPrompt: string) => void;
}

export function FlowCanvas({ guideData, isGenerating, onGenerate, onGuideDataChange, sources, onInputsChange, onTargetTypeChange, onRegenerateImage, onUpdateImagePrompt }: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorData, setEditorData] = useState<EditorNodeData | null>(null);
  const [imageEditorPosition, setImageEditorPosition] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const structureNames = useMemo(
    () => sources.activeStructureEntries.map(e => e.source_path ?? e.title),
    [sources.activeStructureEntries]
  );

  const libraryName = useMemo(
    () => sources.activeLibraryEntries.length > 0
      ? sources.activeLibraryEntries.map(e => e.title).join(', ')
      : null,
    [sources.activeLibraryEntries]
  );

  const handleEditImagePrompt = useCallback((position: string) => {
    setImageEditorPosition(position);
  }, []);

  const initial = useMemo(() => {
    if (!guideData || !guideData.title) {
      return { nodes: buildInitialNodes(), edges: buildInitialEdges() };
    }
    return buildGeneratedLayout(guideData, structureNames, libraryName, onRegenerateImage, handleEditImagePrompt);
  }, [guideData, handleEditImagePrompt, libraryName, onRegenerateImage, structureNames]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  useEffect(() => {
    if (guideData && guideData.title) {
      const layout = buildGeneratedLayout(guideData, structureNames, libraryName, onRegenerateImage, handleEditImagePrompt);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  }, [guideData, handleEditImagePrompt, libraryName, onRegenerateImage, setEdges, setNodes, structureNames]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!guideData) return;
    const mapped = nodeToEditorData(node.id, node.type ?? '', node.data);
    if (mapped) {
      setEditorData(mapped);
      setEditorOpen(true);
    }
  }, [guideData]);

  const handleEditorSave = useCallback((updated: GeneratedGuideData) => {
    onGuideDataChange(updated);
  }, [onGuideDataChange]);

  // Inject dynamic data into special nodes
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'inputNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onGenerate,
            isGenerating,
            hasValidSources: sources.activeStructureEntries.length > 0,
            hasLibrary: sources.activeLibraryEntries.length > 0,
            selectedLibrary: libraryName,
            onAutoSuggest: sources.autoSuggest,
            onInputsChange,
            onTargetTypeChange,
          },
        };
      }
      if (node.type === 'sourcesNode') {
        return {
          ...node,
          data: {
            structureEntries: sources.structureEntries,
            libraryEntries: sources.libraryEntries,
            selectedStructureIds: sources.selectedStructureIds,
            selectedLibraryIds: sources.selectedLibraryIds,
            suggestedLibraryIds: sources.suggestedLibraryIds,
            selectionMode: sources.selectionMode,
            isLoading: sources.isLoading,
            error: sources.error,
            onToggleStructure: sources.toggleStructure,
            onSelectAllStructure: sources.selectAllStructure,
            onDeselectAllStructure: sources.deselectAllStructure,
            onToggleLibrary: sources.toggleLibrary,
            onClearManualOverride: sources.clearManualOverride,
            onRefresh: sources.refresh,
          },
        };
      }
      return node;
    });
  }, [nodes, onGenerate, isGenerating, sources, libraryName, onInputsChange, onTargetTypeChange]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === canvasRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        setIsFullscreen(false);
      }
      return;
    }

    setIsFullscreen(true);
    void canvasRef.current?.requestFullscreen?.().catch(() => {
      setIsFullscreen(true);
    });
  }, [isFullscreen]);

  return (
    <div
      ref={canvasRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] h-screen w-screen overflow-hidden bg-background"
          : "w-full h-[calc(100vh-216px)] min-h-[520px] rounded-[var(--admin-radius)] overflow-hidden border border-border/50 bg-background/50"
      }
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
        proOptions={{ hideAttribution: true }}
        className="guide-flow-canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
        <Controls
          className="!bg-card !border-border !rounded-[var(--admin-radius)] !shadow-card [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
          showFitView={false}
          showInteractive={false}
        >
          <ControlButton
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Expandir canvas'}
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Expandir canvas'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </ControlButton>
        </Controls>
        <MiniMap
          className="!bg-card !border-border !rounded-[var(--admin-radius)] !shadow-card"
          nodeColor="hsl(var(--primary) / 0.3)"
          maskColor="hsl(var(--background) / 0.7)"
          pannable
          zoomable
        />
      </ReactFlow>

      {guideData && (
        <NodeEditorSheet
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          data={editorData}
          guideData={guideData}
          onSave={handleEditorSave}
        />
      )}

      {guideData && imageEditorPosition && (() => {
        const allImages = [
          ...(guideData.image_prompts ?? []),
          ...(guideData.generated_images ?? []),
        ];
        const img = allImages.find(i => i.position === imageEditorPosition);
        if (!img) return null;
        return (
          <ImagePromptEditor
            open={true}
            onClose={() => setImageEditorPosition(null)}
            image={img}
            onRegenerate={onRegenerateImage ?? (() => {})}
            onUpdatePrompt={onUpdateImagePrompt ?? (() => {})}
          />
        );
      })()}
    </div>
  );
}
