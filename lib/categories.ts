export type Category = 'morning' | 'podcast' | 'projekt' | 'research' | 'training' | 'security' | 'sonstige';

export function detectCategory(filename: string): Category {
  const slug = filename.toLowerCase().replace('.html', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  if (/aktien|eintracht|markt|gmail|wetter|morning/.test(slug)) return 'morning';
  if (/podcast/.test(slug)) return 'podcast';
  if (/modulai|architekt|bpp|concord/.test(slug)) return 'projekt';
  if (/research/.test(slug)) return 'research';
  if (/fitness|strava|training/.test(slug)) return 'training';
  if (/security/.test(slug)) return 'security';
  return 'sonstige';
}

export const CATEGORY_META = {
  all:      { label: 'Alle',     emoji: '📋' },
  morning:  { label: 'Morning',  emoji: '☀️' },
  podcast:  { label: 'Podcasts', emoji: '🎙️' },
  projekt:  { label: 'Projekte', emoji: '🏗️' },
  research: { label: 'Research', emoji: '🔍' },
  training: { label: 'Training', emoji: '🚴' },
  security: { label: 'Security', emoji: '🔒' },
  sonstige: { label: 'Sonstige', emoji: '📄' },
} as const;

export type CategoryKey = keyof typeof CATEGORY_META;
