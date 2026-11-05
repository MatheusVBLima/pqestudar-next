'use client';

import { Globe } from 'lucide-react';
import { Portal } from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type AuthorChannel = { platform: 'instagram' | 'youtube' | 'website'; label: string; url: string };

const colors = {
  instagram: 'text-[#E1306C] hover:bg-[#E1306C]/10',
  youtube: 'text-[#FF0000] hover:bg-[#FF0000]/10',
  website: 'text-primary hover:bg-primary/10',
};

export function AuthorChannels({ channels }: { channels: AuthorChannel[] }) {
  return <TooltipProvider delayDuration={200}>
    <div className="flex flex-wrap lg:mt-3 items-center gap-2">
      {channels.map(channel => {
        return <Tooltip key={channel.platform}>
          <TooltipTrigger asChild>
            <a href={channel.url} target="_blank" rel="noopener noreferrer" aria-label={channel.label} className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${colors[channel.platform]}`}>
              {channel.platform === 'website' ? <Globe size={22} strokeWidth={1.7} aria-hidden="true" /> : <img src={`/icons/brands/${channel.platform}.svg`} width={24} height={24} alt="" aria-hidden="true" />}
            </a>
          </TooltipTrigger>
          <Portal><TooltipContent>{channel.label}</TooltipContent></Portal>
        </Tooltip>;
      })}
    </div>
  </TooltipProvider>;
}
