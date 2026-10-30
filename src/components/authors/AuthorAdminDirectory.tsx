"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Award, Flag, Compass, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Feather, Medal, Pencil, Plus, Search, ShieldCheck, Users, SlidersHorizontal, ListFilter } from 'lucide-react';
import { differenceInCalendarDays, differenceInMonths, differenceInYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { safeAuthorUrl, type AuthorBadge, type AuthorProfile } from '@/lib/authors';
import styles from './author-admin.module.css';
import { authorBadgeLevel } from '@/lib/author-badge-levels';

const selectTriggerClass = 'h-10 w-auto max-w-full gap-4 rounded-full border-primary/20 bg-background/70 px-5 text-xs font-medium hover:bg-primary/10 focus:ring-0 focus:ring-offset-0 focus-visible:bg-primary/10 [&>svg]:shrink-0';
const selectContentClass = 'admin-radius rounded-2xl border-primary/20 p-1 shadow-2xl shadow-primary/10 [&_[role=option]]:rounded-xl';

type ManagedAuthor = AuthorProfile & { user_id?: string | null };
export function authorTenure(date: string, now = new Date()) {
  const start = new Date(date);
  if (!Number.isFinite(start.getTime())) return 'Data não informada';
  const years = differenceInYears(now, start);
  const months = differenceInMonths(now, start);
  const days = Math.max(0, differenceInCalendarDays(now, start));
  if (years > 0) return `${years} ${years === 1 ? 'ano' : 'anos'} no PqEstudar`;
  if (months > 0) return `${months} ${months === 1 ? 'mês' : 'meses'} no PqEstudar`;
  return days === 0 ? 'Chegou hoje ao PqEstudar' : `${days} ${days === 1 ? 'dia' : 'dias'} no PqEstudar`;
}

export function AuthorMedal({ badge, iconOnly = false }: { badge: AuthorBadge; iconOnly?: boolean }) {
  const Icon = badge.code === 'pioneer-20' ? Flag : badge.code.startsWith('published') ? Feather : badge.code === 'variety-3' ? Compass : badge.code.startsWith('consistent') ? CalendarDays : badge.code.startsWith('category') ? ShieldCheck : Medal;
  return <span className={styles.badge} title={iconOnly ? undefined : `${badge.title}: ${badge.description}`}><span className={styles.medal} data-level={authorBadgeLevel(badge.code).id}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>{!iconOnly && <small>{badge.title}</small>}</span>;
}

export function AuthorAdminCard({ author, badges = [], badgeState = 'ready', onEdit, preview = false }: { author: ManagedAuthor; badges?: AuthorBadge[]; badgeState?: 'ready' | 'loading' | 'error'; onEdit?: () => void; preview?: boolean }) {
  const shown = badges;
  const initials = author.display_name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'A';
  return <article className={styles.card} data-author-card>
    <div className={styles.portraitArea}><Avatar className={styles.portrait}><AvatarImage src={safeAuthorUrl(author.photo_url)} alt={author.display_name} referrerPolicy="no-referrer" /><AvatarFallback>{initials}</AvatarFallback></Avatar></div>
    <div className={styles.cardBody}>
      <h2 className={styles.name}>{author.display_name || 'Nome do autor'}</h2>
      <p className={styles.headline}>{author.headline || 'Uma apresentação para conectar o autor aos seus leitores.'}</p>
      <div className={styles.badgeTray} aria-label="Conquistas do autor">
        {badgeState === 'loading' ? <p className="text-xs text-muted-foreground">Carregando conquistas…</p> : badgeState === 'error' ? <p role="status" className="text-xs text-muted-foreground">Conquistas indisponíveis no momento.</p> : shown.length ? shown.map(badge => <AuthorMedal key={badge.code} badge={badge} />) : <div className="flex flex-col items-center gap-2 text-muted-foreground"><Award size={22} strokeWidth={1.3} /><span className="text-[11px]">A primeira conquista começa com um guia.</span></div>}
      </div>
      <div className={styles.tenure}><CalendarDays size={16} /><div><strong>{preview && !author.created_at ? 'Sua trajetória começa aqui' : authorTenure(author.created_at)}</strong><small>{author.created_at ? `Perfil cadastrado em ${new Date(author.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'A partir do cadastro do perfil'}</small></div></div>
    </div>
    {!preview && <footer className={styles.cardFooter}><Button variant="outline" size="sm" onClick={onEdit} aria-label={`Editar ${author.display_name}`}><Pencil size={13} className="mr-2" />Editar autor</Button><Button variant="ghost" size="icon" asChild className="h-9 w-9"><Link href={`/autores/${author.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Ver perfil público de ${author.display_name}`} title="Ver perfil público"><ExternalLink size={15} /></Link></Button></footer>}
  </article>;
}

export function AuthorAdminDirectory({ authors, badges, badgeState, onSelect }: { authors: ManagedAuthor[]; badges: AuthorBadge[]; badgeState: 'ready' | 'loading' | 'error'; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const awarded = new Set(badges.map(badge => badge.author_id));
  const incomplete = (author: ManagedAuthor) => !safeAuthorUrl(author.photo_url) || !author.headline?.trim() || !author.bio?.trim();
  const categories = [
    { value: 'all', label: 'Todos', Icon: Users, count: authors.length },
    { value: 'awarded', label: 'Com conquistas', Icon: Award, count: badgeState === 'ready' ? authors.filter(a => awarded.has(a.id)).length : '—' },
    { value: 'incomplete', label: 'A completar', Icon: Pencil, count: authors.filter(incomplete).length },
  ];
  const reset = () => { setSearch(''); setCategory('all'); setAccount('all'); setPage(1); };
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const filtered = authors.filter(a => normalize(`${a.display_name} ${a.headline || ''}`).includes(normalize(search)) && (category === 'all' || (category === 'awarded' ? awarded.has(a.id) : incomplete(a))) && (account === 'all' || (account === 'linked' ? !!a.user_id : !a.user_id))).sort((a, b) => sort === 'recent' ? b.created_at.localeCompare(a.created_at) : sort === 'oldest' ? a.created_at.localeCompare(b.created_at) : a.display_name.localeCompare(b.display_name, 'pt-BR'));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 12)));
  const start = (currentPage - 1) * 12;
  return <>
    <header className={styles.header}><div><p className={styles.eyebrow}>Conteúdo / Autores</p><h1 className={styles.title}>Quem dá voz aos nossos guias</h1><p className={styles.description}>Valorize cada trajetória. Organize os perfis e acompanhe as conquistas de quem compartilha conhecimento.</p></div></header>
    <div className={styles.stats}>{[{ Icon: Users, value: authors.length, label: 'Autores cadastrados' }, { Icon: Award, value: badgeState === 'ready' ? badges.length : '—', label: 'Conquistas alcançadas' }, { Icon: ShieldCheck, value: authors.filter(a => a.user_id).length, label: 'Contas vinculadas' }].map(({ Icon, value, label }) => <div key={label} className={`${styles.panel} ${styles.stat}`}><span className={styles.statIcon}><Icon size={19} strokeWidth={1.6} /></span><div><strong>{value}</strong><small>{label}</small></div></div>)}</div>
    <section className={`${styles.panel} ${styles.toolbar}`} aria-label="Busca e filtros de autores">
      <div className={styles.searchRow}>
        <div className={styles.search}><Search size={20} aria-hidden="true" /><Input aria-label="Buscar autores" placeholder="Pesquisar autor por nome ou apresentação" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /><Button variant="ghost" size="icon" aria-label="Mostrar filtros de autores" aria-expanded={filtersOpen} aria-controls="author-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /></Button></div>
        <Button onClick={() => onSelect('')} className={styles.createButton}><Plus size={16} />Novo autor</Button>
      </div>
      <div className={styles.actionRow}>
        <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="author-filters"><ListFilter size={16} />Filtros{account !== 'all' ? ' (1)' : ''}</Button>
        <Select value={sort} onValueChange={value => { setSort(value); setPage(1); }}><SelectTrigger aria-label="Ordenar autores" className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="name">Nome: A–Z</SelectItem><SelectItem value="recent">Mais recentes</SelectItem><SelectItem value="oldest">Mais antigos</SelectItem></SelectContent></Select>
        {(search || category !== 'all' || account !== 'all') && <Button variant="ghost" size="sm" onClick={reset}>Limpar busca</Button>}
        <div className={styles.pagination}><span role="status" aria-live="polite">{filtered.length ? start + 1 : 0}–{Math.min(start + 12, filtered.length)} de {filtered.length}</span><Button variant="ghost" size="icon" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button><Button variant="ghost" size="icon" aria-label="Próxima página" disabled={start + 12 >= filtered.length} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button></div>
      </div>
      {filtersOpen && <div className={styles.filterRow} id="author-filters"><label>Conta vinculada<Select value={account} onValueChange={value => { setAccount(value); setPage(1); }}><SelectTrigger aria-label="Filtrar conta vinculada" className={selectTriggerClass}><SelectValue /></SelectTrigger><SelectContent className={selectContentClass}><SelectItem value="all">Todas as contas</SelectItem><SelectItem value="linked">Com conta vinculada</SelectItem><SelectItem value="unlinked">Sem conta vinculada</SelectItem></SelectContent></Select></label><p>Perfis a completar: falta foto, apresentação ou biografia.</p></div>}
      <div className={styles.categories} role="group" aria-label="Categorias de autores">{categories.map(({ value, label, Icon, count }) => <button key={value} type="button" aria-pressed={category === value} disabled={value === 'awarded' && badgeState !== 'ready'} onClick={() => { setCategory(value); setPage(1); }}><Icon size={18} /><span>{label}</span><small>{count}</small></button>)}</div>
    </section>
    <div className={styles.grid}>{filtered.slice(start, start + 12).map(author => <AuthorAdminCard key={author.id} author={author} badges={badges.filter(b => b.author_id === author.id)} badgeState={badgeState} onEdit={() => onSelect(author.id)} />)}</div>
    {!filtered.length && <div className={`${styles.panel} ${styles.empty}`}><Users className="mx-auto mb-3" size={28} strokeWidth={1.3} /><p>{authors.length ? 'Nenhum autor encontrado para esta busca.' : 'Sua equipe de autores começa aqui.'}</p><Button variant="link" onClick={() => authors.length ? reset() : onSelect('')}>{authors.length ? 'Limpar todos os filtros' : 'Cadastrar primeiro autor'}</Button></div>}
  </>;
}
