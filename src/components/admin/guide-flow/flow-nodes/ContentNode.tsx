import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { FileText, ListChecks, CheckCircle } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/markdown-content';

interface ContentNodeData {
  label: string;
  content: string;
  sectionIndex: number;
}

function ContentNodeComponent({ data }: { data: ContentNodeData }) {
  const { label, content, sectionIndex } = data;

  const isFaq = /faq|perguntas?\s+frequentes/i.test(label);
  const isConclusion = /conclus[ãa]o|considera[çc][õo]es?\s+finais/i.test(label);
  const isIntro = label === 'Introdução';

  const color = isFaq ? 'cyan' : isConclusion ? 'emerald' : isIntro ? 'green' : 'violet';
  const Icon = isFaq ? ListChecks : isConclusion ? CheckCircle : FileText;
  const typeLabel = isFaq ? 'FAQ' : isConclusion ? 'CONCLUSÃO' : isIntro ? 'INTRO' : `SEÇÃO ${sectionIndex + 1}`;

  const wordCount = content?.split(/\s+/).filter(Boolean).length ?? 0;
  const preview = content
    ?.replace(/^##?\s*\*?\*?.*\*?\*?\s*\n?/, '')
    .trim();

  return (
    <div className={`bg-card border border-${color}-500/30 rounded-[1.2rem] shadow-card w-[320px] overflow-hidden cursor-pointer hover:shadow-lg hover:border-${color}-500/50 transition-all`}>
      <Handle type="target" position={Position.Top} className={`!bg-${color}-500 !w-2.5 !h-2.5 !border-2 !border-card`} />
      <Handle type="target" position={Position.Left} id="left" className={`!bg-${color}-500 !w-2.5 !h-2.5 !border-2 !border-card`} />

      <div className={`bg-${color}-500/8 px-3 py-2 border-b border-${color}-500/15 flex items-center gap-2`}>
        <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
        <span className="text-xs font-semibold truncate flex-1">{label}</span>
        <Badge variant="outline" className={`text-[9px] px-1.5 h-4 border-${color}-500/30 text-${color}-500 shrink-0`}>
          {typeLabel}
        </Badge>
      </div>

      <div className="p-3 space-y-1.5 text-xs">
        <div className="nowheel nodrag nopan max-h-52 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
          <MarkdownContent
            variant="prose"
            className="pointer-events-none break-words text-[11px] leading-relaxed text-foreground/85 [&_a]:break-all [&_a]:text-primary [&_blockquote]:my-2 [&_code]:text-[10px] [&_h1]:mb-2 [&_h1]:mt-1 [&_h1]:text-sm [&_h2]:mb-2 [&_h2]:mt-1 [&_h2]:text-sm [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-xs [&_img]:my-2 [&_img]:max-h-36 [&_img]:w-full [&_img]:object-cover [&_li]:mb-0.5 [&_ol]:mb-2 [&_p]:mb-2 [&_pre]:my-2 [&_table]:text-[10px] [&_ul]:mb-2"
          >
            {preview}
          </MarkdownContent>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <span>{wordCount} palavras</span>
          <span>{content?.split('\n').filter((l: string) => /^###? /.test(l)).length ?? 0} headings</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className={`!bg-${color}-500 !w-2.5 !h-2.5 !border-2 !border-card`} />
      <Handle type="source" position={Position.Right} id="right" className={`!bg-${color}-500 !w-2.5 !h-2.5 !border-2 !border-card`} />
    </div>
  );
}

export const ContentNode = memo(ContentNodeComponent);
