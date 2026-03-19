import type { FastifyInstance } from 'fastify';
import { exportConversationsCSV, getAnalytics } from '../services/storage.js';

const exportQuerySchema = {
  type: 'object',
  properties: {
    period: { type: 'string', enum: ['today', '7days', '30days'] },
  },
  additionalProperties: false,
} as const;

/**
 * Registers export routes.
 *
 * - GET /api/export/csv    — download all conversations as CSV
 * - GET /api/export/report — download a summary report as plain text
 */
export async function exportRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/export/csv
   * Returns conversation data as a downloadable CSV file.
   */
  fastify.get<{ Querystring: { period?: 'today' | '7days' | '30days' } }>(
    '/export/csv',
    {
      schema: { querystring: exportQuerySchema },
    },
    async (request, reply) => {
      try {
        const csv = await exportConversationsCSV(request.query.period);
        const today = new Date().toISOString().slice(0, 10);
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="atendimentos-${today}.csv"`)
          .send(csv);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );

  /**
   * GET /api/export/report
   * Returns a plain text summary report with key metrics.
   */
  fastify.get<{ Querystring: { period?: 'today' | '7days' | '30days' } }>(
    '/export/report',
    {
      schema: { querystring: exportQuerySchema },
    },
    async (request, reply) => {
      try {
        const period = request.query.period ?? '30days';
        const analytics = await getAnalytics(period);
        const today = new Date().toISOString().slice(0, 10);

        const periodLabel =
          period === 'today' ? 'Hoje' : period === '7days' ? 'Últimos 7 dias' : 'Últimos 30 dias';

        const lines: string[] = [
          '=== RELATÓRIO DE ATENDIMENTOS ===',
          `Data: ${today}`,
          `Período: ${periodLabel}`,
          '',
          '--- Indicadores ---',
          `Taxa de finalização: ${Math.round(analytics.finished_rate * 100)}%`,
          `Taxa de abandono: ${Math.round(analytics.abandoned_rate * 100)}%`,
          `Tempo médio primeira resposta: ${analytics.avg_first_response_seconds}s`,
          '',
          '--- Ranking de Tags ---',
        ];

        for (const t of analytics.tag_ranking) {
          lines.push(`  ${t.tag}: ${t.count}`);
        }

        lines.push('', '--- Tendência Diária (últimos 30 dias) ---');
        for (const d of analytics.daily_trend) {
          lines.push(`  ${d.date}: ${d.count} conversas`);
        }

        lines.push('', '=== FIM DO RELATÓRIO ===');

        return reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="relatorio-${today}.txt"`)
          .send(lines.join('\n'));
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
