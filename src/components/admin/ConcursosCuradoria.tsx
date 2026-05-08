import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  Archive,
  ExternalLink,
  Plus,
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";
import { usePendingItems, PendingItem } from "@/hooks/useConcursosAdmin";
import { useOportunidadesAdmin, type OportunidadeInput } from "@/hooks/useOportunidades";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getErrorMessage } from "@/lib/error-message";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  archived: "bg-muted text-muted-foreground border-muted",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  archived: "Arquivado",
};

type OportunidadeCategoria = OportunidadeInput["categoria"];
type OportunidadeTipo = OportunidadeInput["tipo"];
type OportunidadeEscolaridade = OportunidadeInput["escolaridade"];
type OportunidadeAbrangencia = OportunidadeInput["abrangencia"];
type OportunidadeSituacao = OportunidadeInput["situacao"];

const CATEGORIAS: OportunidadeCategoria[] = ["Concurso", "PolÃ­ticas PÃºblicas", "EducaÃ§Ã£o"];
const TIPOS: OportunidadeTipo[] = ["Concurso", "Programa educacional", "Processo seletivo", "Processo Seletivo Simplificado"];
const ESCOLARIDADES: OportunidadeEscolaridade[] = ["Fundamental", "MÃ©dio", "Superior"];
const ABRANGENCIAS: OportunidadeAbrangencia[] = ["Nacional", "Estadual", "Municipal"];
const SITUACOES: OportunidadeSituacao[] = ["Previsto", "Edital publicado", "Aberto", "Encerrado"];

function pickAllowed<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}

export default function ConcursosCuradoria() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");

  const { items, isLoading, refetch, updateStatus, addItem, isUpdating } = usePendingItems(
    statusFilter === "all" ? undefined : statusFilter
  );
  const { createOportunidade } = useOportunidadesAdmin();

  const handleApprove = async (item: PendingItem) => {
    // Validate before approving
    if (!item.titulo_sugerido) {
      toast.error("Item precisa ter um título para ser aprovado");
      return;
    }

    // If situacao is Aberto/Edital publicado, require link_edital
    if (
      (item.situacao_detectada === "Aberto" || item.situacao_detectada === "Edital publicado") &&
      !item.link_edital
    ) {
      toast.error("Link do edital é obrigatório para situação 'Aberto' ou 'Edital publicado'");
      return;
    }

    // Create the oportunidade
    try {
      const slug = item.titulo_sugerido
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 100);

      const oportunidade: OportunidadeInput = {
        titulo: item.titulo_sugerido,
        slug: `${slug}-${Date.now().toString(36)}`,
        categoria: pickAllowed(item.categoria_detectada, CATEGORIAS, "Concurso"),
        tipo: pickAllowed(item.tipo_detectado, TIPOS, "Concurso"),
        escolaridade: pickAllowed(item.escolaridade_detectada, ESCOLARIDADES, "Médio"),
        abrangencia: pickAllowed(item.abrangencia_detectada, ABRANGENCIAS, "Nacional"),
        situacao: pickAllowed(item.situacao_detectada, SITUACOES, "Previsto"),
        data_publicacao: new Date().toISOString(),
        orgao: item.orgao_detectado || undefined,
        banca: item.banca_detectada || undefined,
        resumo_editorial: item.resumo_editorial || undefined,
        link_edital: item.link_edital || undefined,
        publicado: false, // Still needs fonte to publish
        fontes: [
          {
            source_url: item.source_url,
            source_title: item.source_title || item.source_domain || undefined,
            source_tipo: "oficial", // Default, admin should verify
          },
        ],
      };

      await createOportunidade(oportunidade);

      await updateStatus({ id: item.id, status: "approved" });
      toast.success("Item aprovado e oportunidade criada (não publicada - adicione fonte oficial)");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao criar oportunidade"));
    }
  };

  const handleReject = async () => {
    if (!rejectingItem) return;
    
    await updateStatus({
      id: rejectingItem.id,
      status: "rejected",
      rejectionReason: rejectReason,
    });
    
    setRejectDialogOpen(false);
    setRejectingItem(null);
    setRejectReason("");
  };

  const handleArchive = async (item: PendingItem) => {
    await updateStatus({ id: item.id, status: "archived" });
  };

  const handleAddItem = async () => {
    if (!newItemUrl) {
      toast.error("URL é obrigatória");
      return;
    }

    try {
      const domain = new URL(newItemUrl).hostname;
      await addItem({
        source_url: newItemUrl,
        source_domain: domain,
        source_title: newItemTitle || undefined,
        status: "pending",
      });
      setAddDialogOpen(false);
      setNewItemUrl("");
      setNewItemTitle("");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Erro ao adicionar item"));
    }
  };

  const getConfiabilidadeColor = (value: number | null) => {
    if (value === null) return "text-muted-foreground";
    if (value >= 0.8) return "text-emerald-600";
    if (value >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Manualmente
        </Button>
      </div>

      {/* Alert for empty pending */}
      {!isLoading && items.length === 0 && statusFilter === "pending" && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Nenhum item pendente para curadoria. Use o botão "Adicionar Manualmente" para incluir itens.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Título</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Coleta</TableHead>
                <TableHead>Confiab.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.titulo_sugerido || (
                      <span className="text-muted-foreground italic">Sem título</span>
                    )}
                  </TableCell>
                  <TableCell>{item.ano_detectado || "-"}</TableCell>
                  <TableCell>
                    {item.situacao_detectada ? (
                      <Badge variant="outline">{item.situacao_detectada}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {item.source_domain || "Ver"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(item.collected_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className={getConfiabilidadeColor(item.confiabilidade)}>
                      {item.confiabilidade !== null
                        ? `${Math.round(item.confiabilidade * 100)}%`
                        : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                          onClick={() => handleApprove(item)}
                          disabled={isUpdating}
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => {
                            setRejectingItem(item);
                            setRejectDialogOpen(true);
                          }}
                          disabled={isUpdating}
                          title="Rejeitar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleArchive(item)}
                          disabled={isUpdating}
                          title="Arquivar"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {item.status !== "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus({ id: item.id, status: "pending" })}
                        disabled={isUpdating}
                      >
                        Restaurar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum item encontrado com este filtro.
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Item</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Fonte não confiável, informação desatualizada..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item Manualmente</DialogTitle>
            <DialogDescription>
              Adicione uma URL para curadoria manual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL da Fonte *</Label>
              <Input
                value={newItemUrl}
                onChange={(e) => setNewItemUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Título sugerido..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
