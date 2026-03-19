import type { Message } from '../types/index.js';

/** Words that indicate positive sentiment, with their point values. */
const POSITIVE_WORDS: Record<string, number> = {
  'obrigado': 5,
  'obrigada': 5,
  'otimo': 8,
  'ótimo': 8,
  'excelente': 10,
  'perfeito': 10,
  'bom': 3,
  'boa': 3,
  'legal': 4,
  'maravilhoso': 10,
  'maravilhosa': 10,
  'adorei': 8,
  'amei': 8,
  'satisfeito': 7,
  'satisfeita': 7,
  'parabens': 8,
  'parabéns': 8,
  'funciona': 3,
  'funcionou': 5,
  'resolvido': 6,
  'resolveu': 6,
  'rapido': 4,
  'rápido': 4,
  'eficiente': 6,
  'top': 5,
  'show': 5,
  'incrivel': 8,
  'incrível': 8,
};

/** Words that indicate negative sentiment, with their point values (positive numbers, subtracted). */
const NEGATIVE_WORDS: Record<string, number> = {
  'pessimo': 10,
  'péssimo': 10,
  'horrivel': 10,
  'horrível': 10,
  'ruim': 6,
  'insatisfeito': 8,
  'insatisfeita': 8,
  'reclamar': 5,
  'reclamacao': 6,
  'reclamação': 6,
  'lixo': 10,
  'terrivel': 9,
  'terrível': 9,
  'absurdo': 7,
  'vergonha': 8,
  'descaso': 8,
  'demora': 4,
  'demorado': 5,
  'nao funciona': 7,
  'não funciona': 7,
  'nao resolve': 7,
  'não resolve': 7,
  'pior': 6,
  'horrendo': 9,
  'decepcionado': 8,
  'decepcionada': 8,
  'frustrante': 7,
  'raiva': 8,
};

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
 * Calculates a satisfaction score (0-100) based on the sentiment of client messages.
 * Only CLIENT messages are analyzed. Agent messages are ignored.
 * The baseline score is 50. Positive words add points, negative words subtract.
 * The result is clamped to the 0-100 range.
 * @param messages - All messages in a conversation.
 * @returns A satisfaction score from 0 to 100.
 */
export function calculateSatisfactionScore(messages: Message[]): number {
  const clientMessages = messages.filter((m) => m.role === 'client');

  if (clientMessages.length === 0) return 50;

  const allText = clientMessages.map((m) => normalizeText(m.message)).join(' ');
  const allTextNormalized = normalizeText(allText);

  let score = 50;

  for (const [word, points] of Object.entries(POSITIVE_WORDS)) {
    const normalizedWord = normalizeText(word);
    if (allTextNormalized.includes(normalizedWord)) {
      score += points;
    }
  }

  for (const [word, points] of Object.entries(NEGATIVE_WORDS)) {
    const normalizedWord = normalizeText(word);
    if (allTextNormalized.includes(normalizedWord)) {
      score -= points;
    }
  }

  return Math.max(0, Math.min(100, score));
}
