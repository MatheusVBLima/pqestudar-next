"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Filter, Search, SlidersHorizontal } from "lucide-react";
import type { CatalogRoute } from "@/lib/route-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const filterClass = "h-10 w-auto gap-3 rounded-full border-primary/20 bg-background/70 px-4 font-semibold hover:border-primary/40 hover:bg-primary/10 [&>svg]:shrink-0 [&:focus:not(:focus-visible)]:ring-0 [&:focus:not(:focus-visible)]:ring-offset-0";
const menuClass = "admin-radius rounded-2xl border-primary/20 p-1 shadow-2xl shadow-primary/10 [&_[role=option]]:rounded-xl";

function RouteFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className={filterClass}><SelectValue /></SelectTrigger><SelectContent className={menuClass}>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select>;
}

export default function AdminRoutesClient({ routes }: { routes: CatalogRoute[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("all");
  const [kind, setKind] = useState("all");
  const [order, setOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<CatalogRoute | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filtered = routes.filter(route => (area === "all" || route.area === area) && (kind === "all" || route.dynamic === (kind === "dynamic")) && normalize(`${route.name} ${route.path}`).includes(normalize(search.trim())))
    .sort((a, b) => a.path.localeCompare(b.path, "pt-BR", { numeric: true }) * (order === "asc" ? 1 : -1));
  const active = area !== "all" || kind !== "all" || order !== "asc";
  const parameters = selected?.path.match(/\[\[?[^\]]+\]\]?/g) ?? [];
  let valid = true;
  const destination = selected?.path.replace(/\[\[?[^\]]+\]\]?/g, token => {
    const value = (values[token] ?? "").trim();
    if (!value && token.startsWith("[[")) return "";
    const pieces = token.includes("...") ? value.split("/") : [value];
    if (pieces.some(piece => !piece || piece === "." || piece === ".." || /[[\]\\/?#]/.test(piece))) valid = false;
    return pieces.map(encodeURIComponent).join("/");
  }).replace(/\/$/, "") || "/";

  return <div className="space-y-5 [&_button]:rounded-[var(--admin-radius)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">Catálogo de páginas</h1><p className="mt-1 text-sm text-muted-foreground">Encontre páginas e slugs do projeto. Novas rotas entram automaticamente a cada publicação.</p></div>
      <Button variant="outline" onClick={() => router.refresh()}>Atualizar lista</Button>
    </div>
    <div className="overflow-hidden rounded-[28px] border border-primary/15 bg-card/70 shadow-2xl shadow-primary/5">
      <div className="flex items-center gap-3 border-b border-primary/10 bg-card/50 px-4 py-3">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-primary/15 bg-background/60 px-4 shadow-inner shadow-primary/5 lg:max-w-3xl">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input aria-label="Pesquisar página ou slug" placeholder="Pesquisar página ou slug" className="h-10 min-w-0 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" value={search} onChange={event => setSearch(event.target.value)} />
          <Button variant="ghost" size="icon" className={`h-9 w-9 shrink-0 ${showFilters || active ? "bg-primary/15 text-primary" : ""}`} onClick={() => setShowFilters(value => !value)} aria-label="Filtros de pesquisa" aria-expanded={showFilters} aria-controls="route-filters"><SlidersHorizontal className="h-5 w-5" /></Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-primary/10 px-4 py-2">
        <Button variant="ghost" size="icon" className={`h-9 w-9 ${showFilters || active ? "bg-primary/15 text-primary" : ""}`} onClick={() => setShowFilters(value => !value)} aria-label="Filtrar páginas" aria-expanded={showFilters} aria-controls="route-filters"><Filter className="h-4 w-4" /></Button>
        {active && <span className="text-xs text-primary">Filtros ativos</span>}
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">{filtered.length} de {routes.length} páginas</span>
      </div>
      {showFilters && <div id="route-filters" className="flex flex-wrap items-center gap-2 border-b border-primary/10 bg-background/45 px-4 py-3">
        <RouteFilter label="Filtrar por área" value={area} onChange={setArea} options={[["all", "Todas as áreas"], ...Array.from(new Set(routes.map(route => route.area))).sort().map(value => [value, value] as [string, string])]} />
        <RouteFilter label="Filtrar por tipo de rota" value={kind} onChange={setKind} options={[["all", "Todos os tipos"], ["static", "Fixas"], ["dynamic", "Dinâmicas"]]} />
        <RouteFilter label="Ordenar por slug" value={order} onChange={setOrder} options={[["asc", "Slug: A–Z"], ["desc", "Slug: Z–A"]]} />
        {(active || search) && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setArea("all"); setKind("all"); setOrder("asc"); }}>Limpar filtros</Button>}
      </div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-left text-sm">
          <caption className="sr-only">Páginas e rotas do projeto</caption>
          <colgroup><col className="w-[25%]" /><col /><col className="w-[110px]" /><col className="w-[110px]" /><col className="w-[180px]" /></colgroup>
          <thead className="border-b border-primary/10 bg-muted/50 text-xs text-muted-foreground"><tr>{["Página", "Slug / rota", "Área", "Tipo", "Acessar"].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map(route => <tr key={route.path} className="hover:bg-muted/30">
              <td className="px-4 py-3"><span className="block truncate font-medium" title={route.name}>{route.name}</span></td>
              <td className="px-4 py-3">{route.dynamic ? <code className="block truncate text-xs" title={route.path}>{route.path}</code> : <a href={route.path} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-xs text-primary hover:underline" title={`Abrir ${route.path} em nova aba`}>{route.path}</a>}</td>
              <td className="px-4 py-3 text-muted-foreground">{route.area}</td>
              <td className="px-4 py-3 text-muted-foreground">{route.dynamic ? "Dinâmica" : "Fixa"}</td>
              <td className="px-4 py-3">{route.dynamic ? <Button variant="outline" size="sm" onClick={() => { setSelected(route); setValues({}); }}>Informar slug / ID</Button> : <Button asChild variant="ghost" size="sm"><a href={route.path} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${route.path} em nova aba`}>Abrir<ExternalLink className="h-3.5 w-3.5" /></a></Button>}</td>
            </tr>)}
            {!filtered.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma página encontrada com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="admin-radius rounded-[var(--admin-radius)] sm:rounded-[var(--admin-radius)] [&_button]:rounded-[var(--admin-radius)]">
        <DialogHeader><DialogTitle>Abrir página dinâmica</DialogTitle><DialogDescription>Informe o slug ou ID de um conteúdo existente para acessar {selected?.path}.</DialogDescription></DialogHeader>
        {parameters.map(token => <div key={token} className="space-y-2"><Label htmlFor={`param-${token}`}>{token.replace(/[[\].]/g, "")}{token.startsWith("[[") ? " (opcional)" : " *"}</Label><Input id={`param-${token}`} value={values[token] ?? ""} onChange={event => setValues(previous => ({ ...previous, [token]: event.target.value }))} placeholder={token.includes("...") ? "caminho/do-conteudo" : "Slug ou ID existente"} /></div>)}
        {valid && <p className="break-all font-mono text-xs text-muted-foreground">{destination}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>{valid ? <Button asChild><a href={destination} target="_blank" rel="noopener noreferrer">Abrir página<ExternalLink className="h-4 w-4" /></a></Button> : <Button disabled>Abrir página</Button>}</div>
      </DialogContent>
    </Dialog>
  </div>;
}
