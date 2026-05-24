import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  GripVertical, Type, Search, FileText, Image, ListChecks,
  MessageSquare, Link2, Megaphone, ChevronDown, ChevronRight,
  Pencil, Check, X,
} from 'lucide-react';
import type { GeneratedGuideData } from './GuideFlowPreview';

// ─── Node types ───
export type NodeType =
  | 'meta'       // title, slug, category, author
  | 'seo'        // seo_title, seo_description
  | 'intro'      // first paragraph before first H2
  | 'section'    // H2 section with content
  | 'subsection' // H3 inside a section
  | 'image'      // standalone image block
  | 'faq'        // FAQ section
  | 'conclusion' // last section / conclusion
  | 'cta_top'
  | 'cta_middle'
  | 'cta_final'
  | 'links';

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  content: string;
  collapsed: boolean;
  locked?: boolean; // meta/seo can't be reordered
}

// ─── Colors per type ───
const nodeColors: Record<NodeType, { bg: string; border: string; icon: string }> = {
  meta:       { bg: 'bg-primary/5',  border: 'border-primary/20',           icon: 'text-primary' },
  seo:        { bg: 'bg-blue-500/5', border: 'border-blue-500/20',          icon: 'text-blue-500' },
  intro:      { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20',    icon: 'text-emerald-500' },
  section:    { bg: 'bg-violet-500/5', border: 'border-violet-500/20',      icon: 'text-violet-500' },
  subsection: { bg: 'bg-violet-400/5', border: 'border-violet-400/15',      icon: 'text-violet-400' },
  image:      { bg: 'bg-amber-500/5', border: 'border-amber-500/20',        icon: 'text-amber-500' },
  faq:        { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20',          icon: 'text-cyan-500' },
  conclusion: { bg: 'bg-emerald-600/5', border: 'border-emerald-600/20',    icon: 'text-emerald-600' },
  cta_top:    { bg: 'bg-orange-500/5', border: 'border-orange-500/20',      icon: 'text-orange-500' },
  cta_middle: { bg: 'bg-orange-500/5', border: 'border-orange-500/20',      icon: 'text-orange-500' },
  cta_final:  { bg: 'bg-red-500/5', border: 'border-red-500/20',            icon: 'text-red-500' },
  links:      { bg: 'bg-indigo-500/5', border: 'border-indigo-500/20',      icon: 'text-indigo-500' },
};

const nodeIcons: Record<NodeType, React.ElementType> = {
  meta: Type, seo: Search, intro: FileText, section: Type,
  subsection: Type, image: Image, faq: ListChecks, conclusion: FileText,
  cta_top: Megaphone, cta_middle: Megaphone, cta_final: Megaphone, links: Link2,
};

const nodeLabels: Record<NodeType, string> = {
  meta: 'Metadados', seo: 'SEO', intro: 'Introdução', section: 'Seção',
  subsection: 'Subseção', image: 'Imagem', faq: 'FAQ', conclusion: 'Conclusão',
  cta_top: 'CTA Superior', cta_middle: 'CTA Intermediária', cta_final: 'CTA Final', links: 'Links Úteis',
};

// ─── Parse markdown into nodes ───
export function parseMarkdownToNodes(data: GeneratedGuideData): FlowNode[] {
  const nodes: FlowNode[] = [];

  // Meta node (locked)
  nodes.push({
    id: 'meta',
    type: 'meta',
    label: data.title || 'Metadados',
    content: JSON.stringify({ title: data.title, slug: data.slug, category: data.category, public_category: data.public_category, author_name: data.author_name, short_description: data.short_description }),
    collapsed: true,
    locked: true,
  });

  // SEO node (locked)
  nodes.push({
    id: 'seo',
    type: 'seo',
    label: 'SEO',
    content: JSON.stringify({ seo_title: data.seo_title, seo_description: data.seo_description }),
    collapsed: true,
    locked: true,
  });

  // CTA top
  if (data.cta_top) {
    nodes.push({
      id: 'cta_top',
      type: 'cta_top',
      label: data.cta_top.label || 'CTA Superior',
      content: JSON.stringify(data.cta_top),
      collapsed: true,
    });
  }

  // Parse content markdown into sections
  const lines = data.content_markdown.split('\n');
  let currentBlock: string[] = [];
  let currentH2 = '';
  let sectionIndex = 0;
  let hasIntro = false;

  const flushBlock = () => {
    const text = currentBlock.join('\n').trim();
    if (!text) return;

    if (!currentH2 && !hasIntro) {
      // Intro block
      hasIntro = true;
      nodes.push({
        id: `intro-${sectionIndex}`,
        type: 'intro',
        label: 'Introdução',
        content: text,
        collapsed: false,
      });
    } else if (currentH2) {
      // Check for FAQ
      const isFaq = /faq|perguntas?\s+frequentes/i.test(currentH2);
      const isConclusion = /conclus[ãa]o|considera[çc][õo]es?\s+finais|resumo\s+final/i.test(currentH2);

      nodes.push({
        id: `section-${sectionIndex}`,
        type: isFaq ? 'faq' : isConclusion ? 'conclusion' : 'section',
        label: currentH2.replace(/^##\s*\*?\*?/, '').replace(/\*?\*?\s*$/, '').trim(),
        content: text,
        collapsed: false,
      });
    }
    sectionIndex++;
    currentBlock = [];
  };

  for (const line of lines) {
    if (/^## /.test(line)) {
      flushBlock();
      currentH2 = line;
      currentBlock.push(line);
    } else {
      currentBlock.push(line);
    }
  }
  flushBlock();

  // CTA middle
  if (data.cta_middle) {
    // Insert roughly at midpoint of content nodes
    const contentNodes = nodes.filter(n => !n.locked && n.type !== 'cta_top');
    const midIdx = Math.floor(contentNodes.length / 2);
    const insertAfter = contentNodes[midIdx]?.id;
    const midNode: FlowNode = {
      id: 'cta_middle',
      type: 'cta_middle',
      label: data.cta_middle.label || 'CTA Intermediária',
      content: JSON.stringify(data.cta_middle),
      collapsed: true,
    };
    if (insertAfter) {
      const idx = nodes.findIndex(n => n.id === insertAfter);
      nodes.splice(idx + 1, 0, midNode);
    } else {
      nodes.push(midNode);
    }
  }

  // CTA final
  if (data.cta_final) {
    nodes.push({
      id: 'cta_final',
      type: 'cta_final',
      label: data.cta_final.label || 'CTA Final',
      content: JSON.stringify(data.cta_final),
      collapsed: true,
    });
  }

  // Links
  if (data.internal_links.length > 0) {
    nodes.push({
      id: 'links',
      type: 'links',
      label: `Links Úteis (${data.internal_links.length})`,
      content: JSON.stringify(data.internal_links),
      collapsed: true,
    });
  }

  return nodes;
}

// ─── Reconstruct guide data from nodes ───
export function nodesToGuideData(nodes: FlowNode[], original: GeneratedGuideData): GeneratedGuideData {
  const result = { ...original };

  // Meta
  const metaNode = nodes.find(n => n.type === 'meta');
  if (metaNode) {
    try {
      const m = JSON.parse(metaNode.content);
      result.title = m.title ?? result.title;
      result.slug = m.slug ?? result.slug;
      result.category = m.category ?? result.category;
      result.public_category = m.public_category ?? result.public_category;
      result.author_name = m.author_name ?? result.author_name;
      result.short_description = m.short_description ?? result.short_description;
    } catch {
      // Keep original metadata when node content is not valid JSON.
    }
  }

  // SEO
  const seoNode = nodes.find(n => n.type === 'seo');
  if (seoNode) {
    try {
      const s = JSON.parse(seoNode.content);
      result.seo_title = s.seo_title ?? result.seo_title;
      result.seo_description = s.seo_description ?? result.seo_description;
    } catch {
      // Keep original SEO data when node content is not valid JSON.
    }
  }

  // Content - rebuild markdown from ordered content nodes
  const contentNodes = nodes.filter(n =>
    ['intro', 'section', 'subsection', 'image', 'faq', 'conclusion'].includes(n.type)
  );
  result.content_markdown = contentNodes.map(n => n.content).join('\n\n');

  // CTAs
  for (const ctaType of ['cta_top', 'cta_middle', 'cta_final'] as const) {
    const ctaNode = nodes.find(n => n.type === ctaType);
    if (ctaNode) {
      try { result[ctaType] = JSON.parse(ctaNode.content); } catch {
        // Ignore malformed CTA JSON and keep existing data.
      }
    } else {
      result[ctaType] = null;
    }
  }

  // Links
  const linksNode = nodes.find(n => n.type === 'links');
  if (linksNode) {
    try { result.internal_links = JSON.parse(linksNode.content); } catch {
      // Ignore malformed links JSON and keep existing data.
    }
  }

  return result;
}

// ─── Sortable Node ───
function SortableNode({ node, onToggle, onUpdate }: {
  node: FlowNode;
  onToggle: (id: string) => void;
  onUpdate: (id: string, content: string, label?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: node.locked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colors = nodeColors[node.type];
  const Icon = nodeIcons[node.type];
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px';
    }
  }, [editing]);

  const handleSave = () => {
    onUpdate(node.id, editContent);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditContent(node.content);
    setEditing(false);
  };

  // Content preview
  const getPreview = () => {
    if (node.type === 'meta') {
      try {
        const m = JSON.parse(node.content);
        return `${m.title} · ${m.category} · ${m.slug}`;
      } catch { return node.content.slice(0, 100); }
    }
    if (node.type === 'seo') {
      try {
        const s = JSON.parse(node.content);
        return `${s.seo_title} — ${s.seo_description?.slice(0, 60)}...`;
      } catch { return node.content.slice(0, 100); }
    }
    if (['cta_top', 'cta_middle', 'cta_final'].includes(node.type)) {
      try {
        const c = JSON.parse(node.content);
        return `[${c.label}] → ${c.url}`;
      } catch { return node.content.slice(0, 100); }
    }
    if (node.type === 'links') {
      try {
        const links = JSON.parse(node.content) as { label: string }[];
        return links.map((l) => l.label).join(' · ');
      } catch { return node.content.slice(0, 100); }
    }
    // Content nodes: show first ~120 chars
    return node.content.replace(/^##?\s*\*?\*?.*\*?\*?\s*\n?/, '').trim().slice(0, 120) + (node.content.length > 120 ? '…' : '');
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', isDragging && 'z-50')}>
      {/* Connection line */}
      <div className="absolute left-6 -top-3 w-px h-3 bg-border" />

      <Card className={cn(
        'border rounded-[var(--admin-radius)] transition-all',
        colors.bg, colors.border,
        isDragging && 'shadow-lg opacity-90 scale-[1.02]',
        'hover:shadow-md',
      )}>
        <div className="flex items-start gap-0">
          {/* Drag handle */}
          {!node.locked && (
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center w-8 min-h-[44px] cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          {node.locked && <div className="w-3 shrink-0" />}

          {/* Main content */}
          <div className="flex-1 py-2.5 pr-3 min-w-0">
            {/* Header */}
            <button
              onClick={() => onToggle(node.id)}
              className="flex items-center gap-2 w-full text-left"
            >
              <Icon className={cn('h-4 w-4 shrink-0', colors.icon)} />
              <span className="text-sm font-medium truncate flex-1">{node.label}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {nodeLabels[node.type]}
              </Badge>
              {node.collapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Collapsed preview */}
            {node.collapsed && (
              <p className="text-xs text-muted-foreground mt-1 truncate pl-6">
                {getPreview()}
              </p>
            )}

            {/* Expanded content */}
            {!node.collapsed && (
              <div className="mt-2 pl-6 space-y-2">
                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => {
                        setEditContent(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';
                      }}
                      className="text-xs font-mono rounded-[var(--admin-radius)] min-h-[80px] resize-none"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="default" onClick={handleSave} className="h-7 gap-1 text-xs rounded-[var(--admin-radius)]">
                        <Check className="h-3 w-3" /> Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 gap-1 text-xs rounded-[var(--admin-radius)]">
                        <X className="h-3 w-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto font-mono leading-relaxed">
                      {node.content.slice(0, 600)}{node.content.length > 600 ? '…' : ''}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditContent(node.content); setEditing(true); }}
                      className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[var(--admin-radius)]"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Component ───
interface Props {
  data: GeneratedGuideData;
  onChange: (data: GeneratedGuideData) => void;
}

export function GuideFlowNodes({ data, onChange }: Props) {
  const [nodes, setNodes] = useState<FlowNode[]>(() => parseMarkdownToNodes(data));

  // Sync back to parent on node changes
  const syncToParent = useCallback((updatedNodes: FlowNode[]) => {
    const newData = nodesToGuideData(updatedNodes, data);
    onChange(newData);
  }, [data, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setNodes((prev) => {
      const oldIndex = prev.findIndex((n) => n.id === active.id);
      const newIndex = prev.findIndex((n) => n.id === over.id);

      // Don't allow reordering locked nodes or moving past locked nodes
      if (prev[oldIndex]?.locked || prev[newIndex]?.locked) return prev;

      const reordered = arrayMove(prev, oldIndex, newIndex);
      syncToParent(reordered);
      return reordered;
    });
  };

  const handleToggle = (id: string) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, collapsed: !n.collapsed } : n));
  };

  const handleUpdate = (id: string, content: string, label?: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, content, ...(label ? { label } : {}) } : n);
      syncToParent(updated);
      return updated;
    });
  };

  const sortableIds = nodes.filter(n => !n.locked).map(n => n.id);

  // Stats
  const contentNodes = nodes.filter(n => ['intro', 'section', 'faq', 'conclusion'].includes(n.type));
  const ctaNodes = nodes.filter(n => n.type.startsWith('cta_'));

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {contentNodes.length} seções
        </span>
        <span className="flex items-center gap-1">
          <Megaphone className="h-3 w-3" />
          {ctaNodes.length} CTAs
        </span>
        <span className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          {data.internal_links.length} links
        </span>
        <span className="ml-auto text-[10px] opacity-60">Arraste para reorganizar</span>
      </div>

      {/* Node list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {nodes.map((node) => (
              <SortableNode
                key={node.id}
                node={node}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Flow end marker */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
        <div className="w-2 h-2 rounded-full bg-primary/40" />
        <span>Fim do fluxo — {nodes.length} blocos</span>
      </div>
    </div>
  );
}
