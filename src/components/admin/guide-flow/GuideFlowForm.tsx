import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Cog, Eye } from 'lucide-react';
import { TIPOS_GUIA, CATEGORIAS, INTENCOES, CATEGORIAS_PUBLICAS, mapInternaToPublica } from '@/lib/guide-editorial-options';

export type GuideFlowAiProvider = 'lovable' | 'openai';
export type FlowTargetType = 'guide' | 'tool';

export const AI_PROVIDER_OPTIONS: Array<{ value: GuideFlowAiProvider; label: string; description: string }> = [
  { value: 'lovable', label: 'Lovable / Gemini', description: 'Gateway atual do Lovable' },
  { value: 'openai', label: 'OpenAI / ChatGPT', description: 'Usa sua OPENAI_API_KEY' },
];

export const AI_MODEL_OPTIONS: Record<GuideFlowAiProvider, string[]> = {
  lovable: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash'],
  openai: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
};

export const DEFAULT_GUIDE_FLOW_INPUTS: GuideFlowInputs = {
  targetType: 'guide',
  tema: '',
  tipo: '',
  categoria: '',
  categoriaPublica: '',
  palavraChave: '',
  intencao: '',
  contextoAdicional: '',
  visualMode: 'generate',
  aiProvider: 'lovable',
  textModel: 'google/gemini-3-flash-preview',
  imageModel: 'google/gemini-2.5-flash-image',
};

export interface GuideFlowInputs {
  targetType: FlowTargetType;
  tema: string;
  tipo: string;
  categoria: string;          // Categoria Interna
  categoriaPublica: string;   // Categoria Pública (badge visual)
  palavraChave: string;
  intencao: string;
  contextoAdicional: string;
  visualMode: 'generate' | 'prompt_only';
  aiProvider: GuideFlowAiProvider;
  textModel: string;
  imageModel: string;
}

interface Props {
  onGenerate: (inputs: GuideFlowInputs) => void;
  isGenerating: boolean;
}

export function GuideFlowForm({ onGenerate, isGenerating }: Props) {
  const [inputs, setInputs] = useState<GuideFlowInputs>(DEFAULT_GUIDE_FLOW_INPUTS);

  // Sugere automaticamente a Categoria Pública quando a Interna muda (admin pode trocar)
  const handleCategoriaInternaChange = (v: string) => {
    setInputs((p) => ({
      ...p,
      categoria: v,
      categoriaPublica: p.categoriaPublica || mapInternaToPublica(v),
    }));
  };

  const isTool = inputs.targetType === 'tool';
  const canSubmit = inputs.tema.trim() && (isTool || inputs.categoria) && (isTool || inputs.categoriaPublica) && !isGenerating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onGenerate(inputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5 rounded-[var(--admin-radius)] border border-primary/20 bg-primary/5 p-3">
        <Label>Destino do fluxo</Label>
        <Select value={inputs.targetType} onValueChange={(v) => {
          const targetType = v as FlowTargetType;
          setInputs((p) => ({ ...p, targetType, visualMode: targetType === 'tool' ? 'prompt_only' : p.visualMode }));
        }}>
          <SelectTrigger className="rounded-[var(--admin-radius)] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="guide">Guia</SelectItem>
            <SelectItem value="tool">Ferramenta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tema">{isTool ? 'Nome da ferramenta *' : 'Tema do guia *'}</Label>
        <Input
          id="tema"
          placeholder={isTool ? 'Ex: Todas do ENEM' : 'Ex: Como organizar uma rotina de estudos para concursos'}
          value={inputs.tema}
          onChange={(e) => setInputs((p) => ({ ...p, tema: e.target.value }))}
          className="rounded-[var(--admin-radius)]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-[var(--admin-radius)] border border-primary/20 bg-primary/5 p-3">
        <div className="space-y-1.5">
          <Label>IA para gerar o texto</Label>
          <Select
            value={inputs.aiProvider}
            onValueChange={(v) => {
              const aiProvider = v as GuideFlowAiProvider;
              setInputs((p) => ({
                ...p,
                aiProvider,
                textModel: AI_MODEL_OPTIONS[aiProvider][0],
              }));
            }}
          >
            <SelectTrigger className="rounded-[var(--admin-radius)] bg-background">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDER_OPTIONS.map((provider) => (
                <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            A chave da API fica nas secrets da Edge Function.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Modelo</Label>
          <Select value={inputs.textModel} onValueChange={(v) => setInputs((p) => ({ ...p, textModel: v }))}>
            <SelectTrigger className="rounded-[var(--admin-radius)] bg-background">
              <SelectValue placeholder="Modelo..." />
            </SelectTrigger>
            <SelectContent>
              {AI_MODEL_OPTIONS[inputs.aiProvider].map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Enviado junto com o pedido de geracao do guia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo de guia</Label>
          <Select value={inputs.tipo} onValueChange={(v) => setInputs((p) => ({ ...p, tipo: v }))}>
            <SelectTrigger className="rounded-[var(--admin-radius)]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_GUIA.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Cog className="h-3.5 w-3.5 text-primary/70" />
            Categoria Interna *
          </Label>
          <Select value={inputs.categoria} onValueChange={handleCategoriaInternaChange}>
            <SelectTrigger className="rounded-[var(--admin-radius)]">
              <SelectValue placeholder="Editorial..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Guia a IA na geração — não exibida ao público.</p>
        </div>
      </div>

      <div className="space-y-1.5 rounded-[var(--admin-radius)] border border-emerald-500/20 bg-emerald-500/5 p-3">
        <Label className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-emerald-600" />
          Categoria Pública *
        </Label>
        <Select value={inputs.categoriaPublica} onValueChange={(v) => setInputs((p) => ({ ...p, categoriaPublica: v }))}>
          <SelectTrigger className="rounded-[var(--admin-radius)] bg-background">
            <SelectValue placeholder="Badge no site..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_PUBLICAS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Apenas badge visual no site — NÃO influencia a geração.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="palavraChave">Palavra-chave principal</Label>
          <Input
            id="palavraChave"
            placeholder="Ex: rotina de estudos"
            value={inputs.palavraChave}
            onChange={(e) => setInputs((p) => ({ ...p, palavraChave: e.target.value }))}
            className="rounded-[var(--admin-radius)]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Intenção do conteúdo</Label>
          <Select value={inputs.intencao} onValueChange={(v) => setInputs((p) => ({ ...p, intencao: v }))}>
            <SelectTrigger className="rounded-[var(--admin-radius)]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {INTENCOES.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contexto">Contexto adicional / biblioteca</Label>
        <Textarea
          id="contexto"
          placeholder="Cole aqui referências, notas, regras editoriais específicas ou qualquer contexto relevante para este guia..."
          value={inputs.contextoAdicional}
          onChange={(e) => setInputs((p) => ({ ...p, contextoAdicional: e.target.value }))}
          rows={4}
          className="rounded-[var(--admin-radius)]"
        />
        <p className="text-xs text-muted-foreground">Opcional. Informações extras que a IA deve considerar na geração.</p>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-[var(--admin-radius)] gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isTool ? 'Gerando ferramenta...' : 'Gerando guia...'}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {isTool ? 'Gerar página de ferramenta' : 'Gerar guia assistido'}
          </>
        )}
      </Button>
    </form>
  );
}
