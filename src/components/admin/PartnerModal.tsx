import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Partner } from "@/hooks/usePartners";

const partnerSchema = z.object({
  title: z.string()
    .min(3, "Título deve ter no mínimo 3 caracteres")
    .max(80, "Título deve ter no máximo 80 caracteres"),
  logo_url: z.string()
    .url("URL do logo inválida")
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: "URL deve começar com http:// ou https://"
    }),
  url: z.string()
    .url("URL inválida")
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: "URL deve começar com http:// ou https://"
    }),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0, "Ordem deve ser um número positivo")
});

type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  onSave: (data: PartnerFormData) => Promise<void>;
}

export function PartnerModal({ open, onOpenChange, partner, onSave }: PartnerModalProps) {
  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      title: "",
      logo_url: "",
      url: "",
      is_active: true,
      sort_order: 0
    }
  });

  // Reset form when partner changes or modal opens
  useEffect(() => {
    if (open) {
      const values = partner ? {
        title: partner.title,
        logo_url: partner.logo_url,
        url: partner.url,
        is_active: partner.is_active,
        sort_order: partner.sort_order
      } : {
        title: "",
        logo_url: "",
        url: "",
        is_active: true,
        sort_order: 0
      };
      
      console.log('[PartnerModal] Resetting form with values:', values);
      form.reset(values);
    }
  }, [partner, open, form]);

  const handleSubmit = async (data: PartnerFormData) => {
    await onSave(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {partner ? "Editar Parceiro" : "Adicionar Parceiro"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome do parceiro" 
                      {...field} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Logo *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://exemplo.com/logo.png" 
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do Parceiro *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://exemplo.com" 
                      {...field}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem de Exibição</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value ? "Ativo e visível" : "Oculto do público"}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto min-h-[44px]"
              >
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
