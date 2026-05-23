"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Upload, XCircle } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PREMIUM_BENEFIT_TAG } from "@/lib/premium-benefits";

type DraftBenefit = {
  page: number;
  selected: boolean;
  title: string;
  slug: string;
  description_short: string;
  description_full: string;
  external_url: string;
  tags: string;
  status: "draft" | "published";
  imported?: boolean;
  error?: string;
};

type PdfTextItem = { str?: string; transform?: number[] };
type PdfAnnotation = { subtype?: string; url?: string; unsafeUrl?: string };
type ErrorLike = { message?: string; details?: string; hint?: string; code?: string };

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const cleanLine = (line: string) =>
  line
    .replace(/^\s*[•*-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTitle = (line: string) => line.replace(/^#?\s*\d+\s*[-–]\s*/, "").trim();
const isMarkerLine = (line: string) => /^\d{2}$/.test(cleanLine(line));
const isSectionHeading = (line: string) =>
  /^(para que serve\??|quem pode usar|documentos necess[aá]rios|onde encontrar|dica do)/i.test(cleanLine(line));

function getImportErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const err = error as ErrorLike;
    return [err.message, err.details, err.hint, err.code && `Código: ${err.code}`]
      .filter(Boolean)
      .join(" ");
  }
  return "Falha ao salvar os benefícios.";
}

const splitList = (value: string) =>
  value.split(/\n+/).reduce<string[]>((items, rawLine) => {
    const line = cleanLine(rawLine);
    if (!line || /^\d{2}$/.test(line)) return items;

    if (/^\s*[•*-]\s*/.test(rawLine) || items.length === 0) {
      items.push(line);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${line}`.trim();
    }

    return items;
  }, []);

function textItemsToLines(items: PdfTextItem[]) {
  const rows = items
    .filter((item) => item.str?.trim())
    .map((item, index) => ({
      text: item.str!.trim(),
      y: Math.round(item.transform?.[5] ?? 0),
      x: item.transform?.[4] ?? index,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: Array<{ y: number; parts: typeof rows }> = [];
  for (const row of rows) {
    const current = lines.find((line) => Math.abs(line.y - row.y) <= 3);
    if (current) {
      current.parts.push(row);
    } else {
      lines.push({ y: row.y, parts: [row] });
    }
  }

  return lines.map((line) => line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(" ").trim());
}

function sectionBetween(lines: string[], start: RegExp, end: RegExp[]) {
  const startIndex = lines.findIndex((line) => start.test(line));
  if (startIndex < 0) return "";
  const endIndex = lines.findIndex((line, index) => index > startIndex && end.some((pattern) => pattern.test(line)));
  return lines.slice(startIndex + 1, endIndex > -1 ? endIndex : undefined).join("\n").trim();
}

function extractTitle(lines: string[]) {
  const startIndex = lines.findIndex((line) => /^#?\s*\d+\s*[-–]\s*/.test(line));
  if (startIndex < 0) return normalizeTitle(lines[0] ?? "");

  const parts = [normalizeTitle(lines[startIndex])];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    if (!line || isMarkerLine(line) || isSectionHeading(line)) break;
    parts.push(line);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractDescription(lines: string[]) {
  const startIndex = lines.findIndex((line) => /para que serve\??/i.test(line));
  if (startIndex < 0) return "";

  const startLine = lines[startIndex].replace(/.*para que serve\??\s*:?\s*/i, "").trim();
  const rest = sectionBetween(lines, /para que serve\??/i, [/^\d{2}$/, /quem pode usar/i]);
  return splitList([startLine, rest].filter(Boolean).join("\n")).join(" ");
}

function makeDescriptionFull(whoCanUse: string, whereFind: string) {
  const who = splitList(whoCanUse);
  const where = splitList(whereFind);

  return [
    "## **Quem pode usar**",
    ...who.map((item) => `- ${item}`),
    "",
    "## **Onde encontrar**",
    ...where.map((item) => `- ${item}`),
  ].join("\n");
}

function suggestTags(title: string, description: string) {
  const source = `${title} ${description}`.toLowerCase();
  const tags = ["Benefício"];
  if (/energia|luz|el[eé]trica/.test(source)) tags.push("Energia");
  if (/desconto|tarifa|isen[cç][aã]o/.test(source)) tags.push("Desconto");
  if (/cad[uú]nico|governo|social/.test(source)) tags.push("Governo");
  if (/estudante|educa[cç][aã]o|curso/.test(source)) tags.push("Educação");
  if (/transporte|passagem|viagem/.test(source)) tags.push("Transporte");
  if (/sa[uú]de|medicamento|tratamento/.test(source)) tags.push("Saúde");
  return Array.from(new Set(tags));
}

function parseBenefitPage(pageNumber: number, lines: string[], urls: string[]): DraftBenefit | null {
  const title = extractTitle(lines);
  if (!title) return null;

  const description = extractDescription(lines);
  const whoCanUse = sectionBetween(lines, /quem pode usar/i, [/^\d{2}$/, /documentos necess[aá]rios/i, /onde encontrar/i]);
  const whereFind = sectionBetween(lines, /onde encontrar/i, [/dica do/i]);
  const descriptionFull = makeDescriptionFull(whoCanUse, whereFind);

  return {
    page: pageNumber,
    selected: true,
    title,
    slug: slugify(title),
    description_short: cleanLine(description),
    description_full: descriptionFull,
    external_url: urls[0] ?? "",
    tags: suggestTags(title, description).join(", "),
    status: "draft",
  };
}

export default function AdminPremiumBenefitImport() {
  const { user } = useAuth();
  const [fileName, setFileName] = useState("");
  const [drafts, setDrafts] = useState<DraftBenefit[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCount = useMemo(() => drafts.filter((draft) => draft.selected && !draft.imported).length, [drafts]);

  const updateDraft = <K extends keyof DraftBenefit>(index: number, key: K, value: DraftBenefit[K]) => {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, [key]: value } : draft)));
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setDrafts([]);
    setIsParsing(true);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      const parsed: DraftBenefit[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const [textContent, annotations] = await Promise.all([
          page.getTextContent(),
          page.getAnnotations(),
        ]);
        const lines = textItemsToLines(textContent.items as PdfTextItem[]);
        const urls = (annotations as PdfAnnotation[])
          .filter((annotation) => annotation.subtype === "Link")
          .map((annotation) => annotation.url || annotation.unsafeUrl || "")
          .filter(Boolean);

        const benefit = parseBenefitPage(pageNumber, lines, urls);
        if (benefit) parsed.push(benefit);
      }

      setDrafts(parsed);
      toast({
        title: "PDF processado",
        description: `${parsed.length} benefício(s) extraído(s) para revisão.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível ler o PDF.";
      toast({ title: "Erro ao processar PDF", description: message, variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const saveSelected = async () => {
    const items = drafts.filter((draft) => draft.selected && !draft.imported);
    if (items.length === 0) return;
    setIsSaving(true);

    try {
      for (const item of items) {
        const tags = Array.from(new Set([
          PREMIUM_BENEFIT_TAG,
          ...item.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        ]));

        const { error } = await supabase.from("premium_items").insert({
          item_type: "course",
          title: item.title.trim(),
          slug: item.slug.trim(),
          description_short: item.description_short.trim() || null,
          description_full: item.description_full.trim() || null,
          external_url: item.external_url.trim() || null,
          tags,
          status: item.status,
          created_by: user?.id,
          updated_by: user?.id,
        });

        if (error) {
          const message = getImportErrorMessage(error);
          setDrafts((prev) => prev.map((draft) => (draft === item ? { ...draft, error: message } : draft)));
          throw error;
        }

        setDrafts((prev) => prev.map((draft) => (draft === item ? { ...draft, imported: true, error: undefined } : draft)));
      }

      toast({
        title: "Importação concluída",
        description: `${items.length} benefício(s) criado(s) como rascunho.`,
      });
    } catch (error) {
      const message = getImportErrorMessage(error);
      toast({ title: "Erro ao importar", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/premium" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Importar benefícios por PDF</h1>
            <p className="text-muted-foreground">Extraia benefícios selecionáveis do PDF e salve em lote como rascunhos.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arquivo</CardTitle>
          <CardDescription>Use um PDF com texto selecionável. Cada página deve representar um benefício.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="benefits-pdf">PDF de benefícios</Label>
            <Input
              id="benefits-pdf"
              type="file"
              accept="application/pdf"
              disabled={isParsing || isSaving}
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              {fileName}
            </div>
          )}
          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lendo páginas, textos e links do PDF...
            </div>
          )}
        </CardContent>
      </Card>

      {drafts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Revisão</h2>
            <p className="text-sm text-muted-foreground">{selectedCount} benefício(s) selecionado(s) para importar.</p>
          </div>
          <Button onClick={saveSelected} disabled={isSaving || selectedCount === 0}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Importar selecionados
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <Card key={`${draft.page}-${draft.slug}`}>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={draft.selected}
                    disabled={draft.imported}
                    onCheckedChange={(checked) => updateDraft(index, "selected", Boolean(checked))}
                  />
                  <div>
                    <CardTitle className="text-lg">Página {draft.page}</CardTitle>
                    <CardDescription>Revise os campos antes de salvar.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {draft.imported && <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Importado</Badge>}
                  {draft.error && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Título</Label>
                  <Input value={draft.title} onChange={(event) => updateDraft(index, "title", event.target.value)} disabled={draft.imported} />
                </div>
                <div className="grid gap-2">
                  <Label>Slug</Label>
                  <Input value={draft.slug} onChange={(event) => updateDraft(index, "slug", event.target.value)} disabled={draft.imported} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Descrição curta</Label>
                <Textarea rows={2} value={draft.description_short} onChange={(event) => updateDraft(index, "description_short", event.target.value)} disabled={draft.imported} />
              </div>

              <div className="grid gap-2">
                <Label>Descrição completa (Markdown)</Label>
                <Textarea rows={9} className="font-mono text-sm" value={draft.description_full} onChange={(event) => updateDraft(index, "description_full", event.target.value)} disabled={draft.imported} />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div className="grid gap-2">
                  <Label>CTA principal - link dos documentos necessários</Label>
                  <Input value={draft.external_url} onChange={(event) => updateDraft(index, "external_url", event.target.value)} disabled={draft.imported} placeholder="https://..." />
                </div>
                <div className="grid gap-2">
                  <Label>Tags</Label>
                  <Input value={draft.tags} onChange={(event) => updateDraft(index, "tags", event.target.value)} disabled={draft.imported} />
                </div>
              </div>

              {draft.error && <p className="text-sm text-destructive">{draft.error}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
