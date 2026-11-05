import { parseGuideSections } from '../../../src/lib/guide-sections.ts';

export interface LibraryImage {
  storage_path: string; description: string; tags: string[];
  purpose: string; source: string; license: string; approved: boolean;
}
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stop = new Set('como para uma esse essa isso este esta sobre antes depois mais guia quais qual onde quando fazer usar voce passo passos'.split(' '));
const tokens = (text: string) => [...new Set(normalize(text).match(/[a-z0-9]{4,}/g) || [])].filter(t => !stop.has(t));
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

export function rankImages(images: LibraryImage[], subject: string, purpose: string, excluded = new Set<string>(), usage: Record<string, number> = {}) {
  const terms = tokens(subject);
  return images.filter(a => a.approved && a.license && a.source && a.purpose === purpose && !excluded.has(a.storage_path))
    .map(asset => {
      const tags = tokens(asset.tags.join(' '));
      const matched = tags.filter(t => terms.includes(t)).length;
      return { asset, matched, confidence: matched / Math.max(tags.length, 1) };
    })
    .filter(r => r.matched >= 2 && r.confidence >= 0.6)
    .sort((a,b) => b.confidence - a.confidence || (usage[a.asset.storage_path] || 0) - (usage[b.asset.storage_path] || 0) || a.asset.storage_path.localeCompare(b.asset.storage_path));
}

function plain(text: string) { return text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[*_`]/g, '').trim(); }
function wrap(text: string, width: number) {
  const lines: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > width && line) { lines.push(line); line = ''; }
    line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

// Refuse long, nested or incomplete steps instead of silently abbreviating instructions.
export function diagramForSection(content: string, title: string): string | null {
  if (/```|~~~|^[ \t]+\S/m.test(content)) return null;
  const steps = [...content.matchAll(/^(\d+)[.)]\s+(.+)$/gm)];
  if (steps.length < 3 || steps.length > 5 || steps.some((s,i) => Number(s[1]) !== i+1)) return null;
  const labels = steps.map(s => plain(s[2]));
  if (labels.some(s => !s || s.length > 100 || /\S{28}/.test(s))) return null;
  const heading = plain(title);
  if (heading.length > 85) return null;
  const cards = labels.map((label,i) => {
    const y = 180 + i * 140;
    return `<rect x="70" y="${y}" width="1060" height="116" rx="18" fill="#23344d"/><circle cx="125" cy="${y+58}" r="27" fill="#b7f36b"/><text x="125" y="${y+68}" text-anchor="middle" font-size="28" fill="#102030">${i+1}</text><text x="180" y="${y+48}" font-size="28" fill="white">${wrap(label,54).map((line,j) => `<tspan x="180" dy="${j ? 35 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
  }).join('');
  const height = 220 + labels.length * 140;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="#101c2e"/><g font-family="Arial, sans-serif"><text x="70" y="55" fill="#b7f36b" font-size="20">PQESTUDAR · ESQUEMA ILUSTRATIVO</text><text x="70" y="105" fill="white" font-size="32">${wrap(heading,55).map((line,j) => `<tspan x="70" dy="${j ? 38 : 0}">${escape(line)}</tspan>`).join('')}</text>${cards}</g></svg>`;
}

export function automaticSections(markdown: string) {
  return parseGuideSections(markdown).map((section,index) => ({...section, position: `after_section_${index+1}`}));
}
