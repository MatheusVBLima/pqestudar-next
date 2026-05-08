"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NextLink from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { slugifyProductTitle } from "@/lib/product-slug";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Plus, Pencil, Trash2, EyeOff, Upload, Link as LinkIcon, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";
import { revalidateProductsAction } from "@/app/actions/revalidate";

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  cta_url: string;
  clicks_count: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type ProductFormData = {
  title: string;
  description: string;
  category: string;
  cta_url: string;
  image_url: string;
  sort_order: string;
  imageFile: File | null;
  imageTab: "upload" | "url";
};

const EMPTY_FORM: ProductFormData = {
  title: "",
  description: "",
  category: "",
  cta_url: "",
  image_url: "",
  sort_order: "0",
  imageFile: null,
  imageTab: "url",
};

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function ProductCard({
  product,
  isAdmin,
  adminMode,
  onClickSaibaMais,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  product: Product;
  isAdmin: boolean;
  adminMode: boolean;
  onClickSaibaMais: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const detailHref = `/produtos/${slugifyProductTitle(product.title)}`;

  return (
    <Card className="flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm border px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Eye className="h-3 w-3" />
          {product.clicks_count}
        </span>
      </div>

      {isAdmin && adminMode && !product.is_active && (
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
            <EyeOff className="h-3 w-3 mr-1" /> Oculto
          </Badge>
        </div>
      )}

      <NextLink href={detailHref} className="block w-full aspect-[16/10] overflow-hidden bg-muted group">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </NextLink>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <NextLink href={detailHref} className="hover:text-primary transition-colors">
          <h3 className="text-lg font-semibold leading-tight">{product.title}</h3>
        </NextLink>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="flex flex-col gap-3 mt-auto pt-2">
          <Badge variant="secondary" className="w-fit text-xs">
            {product.category}
          </Badge>
          <Button className="w-full" onClick={onClickSaibaMais}>
            Saiba Mais
          </Button>
        </div>

        {isAdmin && adminMode && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleActive}>
              {product.is_active ? (
                <><EyeOff className="h-4 w-4 mr-1" /> Ocultar</>
              ) : (
                <><Eye className="h-4 w-4 mr-1" /> Mostrar</>
              )}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function ProductModal({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ProductFormData;
  onSave: (data: ProductFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const isEdit = initial.title !== "";

  useEffect(() => {
    if (open) {
      setForm(initial);
      setLocalPreview(null);
    }
  }, [open, initial]);

  const handleOpen = (v: boolean) => {
    if (v) {
      setForm(initial);
      setLocalPreview(null);
    }
    onOpenChange(v);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Aceitos: PNG, JPG, WEBP", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo: 3MB", variant: "destructive" });
      return;
    }
    setForm((f) => ({ ...f, imageFile: file, imageTab: "upload" }));
    setLocalPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, imageFile: null, image_url: "" }));
    setLocalPreview(null);
  };

  const valid = form.title.trim() && form.description.trim() && form.category.trim() && form.cta_url.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do produto." : "Preencha os dados do novo produto."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Imagem do Produto (opcional)</Label>
            <Tabs
              value={form.imageTab}
              onValueChange={(v) => setForm((f) => ({ ...f, imageTab: v as "upload" | "url" }))}
              className="mt-1.5"
            >
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1 gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-2 space-y-2">
                {localPreview || (form.imageTab === "upload" && form.image_url) ? (
                  <div className="relative rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={localPreview || form.image_url}
                      alt="Preview"
                      className="w-full h-32 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP (máx. 3MB)</span>
                    <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.webp" onChange={handleFileSelect} />
                  </label>
                )}
              </TabsContent>

              <TabsContent value="url" className="mt-2 space-y-2">
                <Input
                  placeholder="https://exemplo.com/imagem.png"
                  value={form.imageTab === "url" ? form.image_url : ""}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value, imageFile: null }))}
                />
                {form.imageTab === "url" && form.image_url.trim() && (
                  <div className="relative rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-full h-32 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Label htmlFor="prod-title">Título *</Label>
            <Input id="prod-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prod-desc">Descrição *</Label>
            <Textarea id="prod-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prod-cat">Categoria *</Label>
            <Input id="prod-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prod-cta">URL do CTA *</Label>
            <Input id="prod-cta" value={form.cta_url} onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="prod-order">Ordem</Label>
            <Input id="prod-order" type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(form)} disabled={!valid || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProdutosNext() {
  const ps = usePageSettings("/produtos");
  const { isAdmin, loading: adminLoading } = useUserRoles();
  const queryClient = useQueryClient();

  const [adminMode, setAdminMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: adminProducts = [] } = useQuery({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action: "list", data: {} },
      });
      if (error) throw error;
      return data as Product[];
    },
    enabled: isAdmin && adminMode,
  });

  const displayProducts = isAdmin && adminMode ? adminProducts : products;

  const clickMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.rpc("increment_product_click", { product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-public"] });
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
    },
  });

  const handleSaibaMais = (product: Product) => {
    clickMutation.mutate(product.id);
    if (product.cta_url && product.cta_url !== "#") {
      window.open(product.cta_url, "_blank", "noopener,noreferrer");
    }
  };

  const adminMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data: Record<string, unknown> }) => {
      const { data: res, error } = await supabase.functions.invoke("admin-products", {
        body: { action, data },
      });
      if (error) throw error;
      return res;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["products-public"] });
      queryClient.invalidateQueries({ queryKey: ["products-admin"] });
      await revalidateProductsAction();
    },
  });

  const handleSave = async (form: ProductFormData) => {
    let finalImageUrl: string | null = form.image_url.trim() || null;

    if (form.imageFile) {
      const productId = editingProduct?.id || "new";
      const ext = form.imageFile.name.split(".").pop() || "png";
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, form.imageFile, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({ title: "Upload falhou", description: uploadError.message, variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      finalImageUrl = urlData.publicUrl;
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      cta_url: form.cta_url.trim(),
      image_url: finalImageUrl,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
      adminMutation.mutate(
        { action: "update", data: payload },
        {
          onSuccess: () => {
            toast({ title: "Produto atualizado com sucesso." });
            setModalOpen(false);
            setEditingProduct(null);
          },
          onError: (err: unknown) => {
            toast({ title: "Erro ao atualizar produto", description: getErrorMessage(err), variant: "destructive" });
          },
        }
      );
    } else {
      adminMutation.mutate(
        { action: "create", data: payload },
        {
          onSuccess: () => {
            toast({ title: "Produto criado com sucesso." });
            setModalOpen(false);
          },
          onError: (err: unknown) => {
            toast({ title: "Erro ao criar produto", description: getErrorMessage(err), variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    adminMutation.mutate(
      { action: "delete", data: { id: deleteTarget.id } },
      {
        onSuccess: () => {
          toast({ title: "Produto excluído." });
          setDeleteTarget(null);
        },
        onError: (err: unknown) => {
          toast({ title: "Erro ao excluir", description: getErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const handleToggleActive = (product: Product) => {
    adminMutation.mutate(
      { action: "toggleActive", data: { id: product.id, is_active: !product.is_active } },
      {
        onSuccess: () => {
          toast({ title: product.is_active ? "Produto ocultado." : "Produto reativado." });
        },
        onError: (err: unknown) => {
          toast({ title: "Erro ao alternar visibilidade", description: getErrorMessage(err), variant: "destructive" });
        },
      }
    );
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const formInitial: ProductFormData = editingProduct
    ? {
        title: editingProduct.title,
        description: editingProduct.description,
        category: editingProduct.category,
        cta_url: editingProduct.cta_url,
        image_url: editingProduct.image_url || "",
        sort_order: String(editingProduct.sort_order),
        imageFile: null,
        imageTab: editingProduct.image_url ? "url" : "upload",
      }
    : EMPTY_FORM;

  return (
    <>
      <PageHero title={ps.headerTitle} description={ps.headerDescription} isLoading={ps.isLoading} />

      <main className="container mx-auto px-6 pt-8 md:pt-12 pb-16">
        {!adminLoading && isAdmin && (
          <div className="flex items-center gap-3 mb-6">
            <Switch
              id="admin-mode-produtos"
              checked={adminMode}
              onCheckedChange={setAdminMode}
            />
            <Label htmlFor="admin-mode-produtos" className="text-sm font-medium cursor-pointer">
              Modo de Gerenciamento
            </Label>
          </div>
        )}

        {isAdmin && adminMode && (
          <div className="flex items-center gap-3 mb-6">
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Produto
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-[1.2rem]" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum produto disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAdmin={isAdmin}
                adminMode={adminMode}
                onClickSaibaMais={() => handleSaibaMais(product)}
                onEdit={() => openEditModal(product)}
                onDelete={() => setDeleteTarget(product)}
                onToggleActive={() => handleToggleActive(product)}
              />
            ))}
          </div>
        )}
      </main>

      <ProductModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditingProduct(null);
        }}
        initial={formInitial}
        onSave={handleSave}
        saving={adminMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto &quot;{deleteTarget?.title}&quot; será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
