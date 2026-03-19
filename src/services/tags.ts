import type { Message } from '../types/index.js';

/** A rule that maps a tag to keywords and a priority level. */
interface TagRule {
  tag: string;
  keywords: string[];
  priority: 'high' | 'medium' | 'low';
}

/** Predefined tag rules for auto-tagging conversations. */
const TAG_RULES: TagRule[] = [
  { tag: 'Risco de churn', keywords: ['cancelar', 'cancela', 'cancelamento', 'desistir', 'nao quero mais', 'não quero mais'], priority: 'high' },
  { tag: 'Comercial', keywords: ['preco', 'preço', 'valor', 'plano', 'desconto', 'pagamento', 'assinatura', 'comprar'], priority: 'medium' },
  { tag: 'Suporte', keywords: ['erro', 'problema', 'bug', 'nao funciona', 'não funciona', 'nao consigo', 'não consigo', 'ajuda', 'quebrado'], priority: 'medium' },
  { tag: 'Elogio', keywords: ['obrigado', 'excelente', 'otimo', 'ótimo', 'perfeito', 'parabens', 'parabéns', 'adorei'], priority: 'low' },
  { tag: 'Urgente', keywords: ['urgente', 'urgencia', 'urgência', 'emergencia', 'emergência', 'imediato'], priority: 'high' },
];

/** Priority ordering for sorting tags. */
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Normalizes a string by lowercasing and removing diacritical marks (accents).
 * @param text - The text to normalize.
 * @returns The normalized string.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Scans all messages in a conversation for keyword matches and returns detected tags.
 * Tags are returned sorted by priority (high first), then alphabetically.
 * @param messages - The messages to scan.
 * @returns An array of unique tag strings.
 */
export function detectTags(messages: Message[]): string[] {
  const allText = messages.map((m) => normalizeText(m.message)).join(' ');
  const matched: { tag: string; priority: string }[] = [];
  const seen = new Set<string>();

  for (const rule of TAG_RULES) {
    if (seen.has(rule.tag)) continue;
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (allText.includes(normalizedKeyword)) {
        matched.push({ tag: rule.tag, priority: rule.priority });
        seen.add(rule.tag);
        break;
      }
    }
  }

  matched.sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
    if (pDiff !== 0) return pDiff;
    return a.tag.localeCompare(b.tag);
  });

  return matched.map((m) => m.tag);
}
