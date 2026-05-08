import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { BonusPage } from "@/hooks/useBonusPages";

const toolSchema = z.object({
  logoUrl: z.string().url().or(z.literal("")),
  logoAlt: z.string().min(1, "Alt text é obrigatório"),
  toolTitle: z.string().min(1, "Título é obrigatório"),
  toolDescription: z.string().min(1, "Descrição é obrigatória"),
  toolLink: z.string().url().or(z.literal("")),
});

const bonusPageSchema = z.object({
  slug: z.string().min(1, "URL é obrigatória").regex(/^\/[a-z0-9-]+$/, "URL deve começar com / e conter apenas letras minúsculas, números e hífens"),
  title: z.string().min(1, "Título é obrigatório"),
  intro: z.string().min(1, "Introdução é obrigatória"),
  cards: z.array(toolSchema).length(3, "Devem haver exatamente 3 ferramentas"),
  status: z.enum(['visible', 'hidden']),
  sort_order: z.number().int().min(0),
});

type BonusPageFormData = z.infer<typeof bonusPageSchema>;

interface BonusPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: BonusPage | null;
  onSave: (data: BonusPageFormData) => Promise<void>;
}

export const BonusPageModal = ({
  open,
  onOpenChange,
  page,
  onSave,
}: BonusPageModalProps) => {
  const form = useForm<BonusPageFormData>({
    resolver: zodResolver(bonusPageSchema),
    defaultValues: {
      slug: "",
      title: "",
      intro: "",
      cards: [
        { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
        { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
        { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
      ],
      status: 'visible',
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (open && page) {
      form.reset({
        slug: page.slug,
        title: page.title,
        intro: page.intro,
        cards: page.cards,
        status: page.status,
        sort_order: page.sort_order,
      });
    } else if (open && !page) {
      form.reset({
        slug: "",
        title: "",
        intro: "",
        cards: [
          { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
          { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
          { logoUrl: "", logoAlt: "", toolTitle: "", toolDescription: "", toolLink: "" },
        ],
        status: 'visible',
        sort_order: 0,
      });
    }
  }, [open, page, form]);

  const handleSubmit = async (data: BonusPageFormData) => {
    await onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {page ? "Editar Página de Bônus" : "Nova Página de Bônus"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL (Slug)</FormLabel>
                  <FormControl>
                    <Input placeholder="/exemplo-slug-unico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título (H1)</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da página" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Introdução</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Parágrafo introdutório" 
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-6 border-t pt-6">
              <h3 className="font-semibold text-lg">Ferramentas (3 cards)</h3>
              
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium">Ferramenta {index + 1}</h4>
                  
                  <FormField
                    control={form.control}
                    name={`cards.${index}.toolTitle`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da ferramenta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`cards.${index}.toolDescription`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrição curta da ferramenta" 
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`cards.${index}.logoUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logo</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`cards.${index}.logoAlt`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alt do Logo</FormLabel>
                          <FormControl>
                            <Input placeholder="Texto alternativo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`cards.${index}.toolLink`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link da Ferramenta</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visível</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Página acessível via link direto
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === 'visible'}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? 'visible' : 'hidden')
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
