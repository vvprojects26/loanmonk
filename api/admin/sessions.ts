// ============================================================
// GET /api/admin/sessions
// List all assessment sessions with summary data
// Admin auth required
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../../lib/utils/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Admin auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getServerSupabase();

    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const riskFilter = req.query.risk_rating as string;
    const statusFilter = req.query.status as string;
    const sortBy = (req.query.sort_by as string) || 'started_at';
    const sortOrder = (req.query.sort_order as string) === 'asc' ? true : false;

    // Build query
    let query = supabase
      .from('sessions')
      .select(`
        id,
        user_id,
        started_at,
        completed_at,
        duration_sec,
        status,
        question_count,
        target_industry,
        assessments (
          id,
          pd_blended,
          pd_phase1_only,
          pd_modified,
          risk_rating,
          decision,
          money_profile,
          consistency_index,
          blended_trait_scores,
          trait_scores
        )
      `, { count: 'exact' });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    query = query.order(sortBy, { ascending: sortOrder }).range(offset, offset + limit - 1);

    const { data: sessions, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }

    // Transform to flat list items
    const items = (sessions || []).map((s: Record<string, unknown>) => {
      const assessments = s.assessments as Array<Record<string, unknown>> | null;
      const assessment = assessments && assessments.length > 0 ? assessments[0] : null;
      const consistency = assessment?.consistency_index as { overall?: number; flag?: string } | null;

      return {
        session_id: s.id,
        user_id: s.user_id,
        started_at: s.started_at,
        completed_at: s.completed_at,
        duration_sec: s.duration_sec,
        status: s.status,
        question_count: s.question_count,
        industry: s.target_industry,
        pd_blended: assessment?.pd_blended ?? assessment?.pd_phase1_only ?? null,
        risk_rating: assessment?.risk_rating ?? null,
        decision: assessment?.decision ?? 'pending',
        money_profile: assessment?.money_profile ?? null,
        consistency_flag: consistency?.flag ?? null,
        consistency_overall: consistency?.overall ?? null,
      };
    });

    // Apply risk filter on joined data (post-query)
    const filtered = riskFilter
      ? items.filter((item) => item.risk_rating === riskFilter)
      : items;

    return res.status(200).json({
      sessions: filtered,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Internal server error', details: errMsg });
  }
}
