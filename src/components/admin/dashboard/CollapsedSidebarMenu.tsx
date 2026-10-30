"use client";
import { useEffect, useRef, useState, type ElementType } from 'react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function CollapsedSidebarMenu({ title, icon: Icon, items, pathname, className }: {
  title: string; icon: ElementType; items: Array<{ title: string; href: string; icon: ElementType }>; pathname: string; className: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const closeSoon = () => { cancelClose(); timer.current = setTimeout(() => setOpen(false), 160); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" aria-label={title} className={className} onPointerEnter={event => { if (event.pointerType === 'mouse') { cancelClose(); setOpen(true); } }} onPointerLeave={closeSoon}><Icon className="h-4 w-4" /></button></PopoverTrigger>
    <PopoverContent side="right" align="start" sideOffset={12} collisionPadding={12} onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onPointerEnter={cancelClose} onPointerLeave={closeSoon} onFocusCapture={cancelClose} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeSoon(); }} aria-label={title} className="w-56 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border-border bg-card p-2 shadow-xl">
      <p className="px-2 py-2 text-xs font-semibold text-muted-foreground">{title}</p>
      {items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn('flex items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-muted focus-visible:outline-primary', pathname === item.href && 'bg-primary/10 text-primary')}><item.icon size={15} /><span>{item.title}</span></Link>)}
    </PopoverContent>
  </Popover>;
}
