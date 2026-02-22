// ============================================================
// Session Detail Page — Full risk report per spec Section 6.2
// Sections A-E: Risk Summary, OCEAN Breakdown, Loan Recommendation,
// Behavioral Signals, Admin Comments/Override
// Plus Phase 2 panels: Behavioral Heatmap, Consistency, BART Score
// ============================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/api.js';
import { OceanChart } from '../components/charts/OceanChart.js';
import { ConsistencyPanel } from '../components/charts/ConsistencyPanel.js';
import { BartScoreCard } from '../components/charts/BartScoreCard.js';
import { BehavioralHeatmap } from '../components/charts/BehavioralHeatmap.js';
import { OverrideModal } from '../components/overrides/OverrideModal.js';

interface DetailData {
  session: Record<string, unknown>;
  assessment: Record<string, unknown> | null;
  responses: Array<Record<string, unknown>>;
  behavioral_signals: Record<string, unknown> | null;
  loan_recommendation: Record<string, unknown> | null;
}

export function SessionDetailPage({ token }: { token: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await adminApi.getSessionDetail(token, id) as DetailData;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>Loading session detail...</div>;
  if (error) return <div style={{ color: 'var(--danger)', padding: 40 }}>{error}</div>;
  if (!data || !data.assessment) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Assessment not found</div>;

  const session = data.session;
  const assessment = data.assessment;
  const responses = data.responses;
  const behavioral = data.behavioral_signals;
  const loanRec = data.loan_recommendation;

  const traitScores = (assessment.blended_trait_scores || assessment.trait_scores) as Record<string, number>;
  const consistency = assessment.consistency_index as Record<string, number> | null;
  const pdScore = (assessment.pd_blended || assessment.pd_modified) as number;
  const riskRating = assessment.risk_rating as string;
  const behavioralSignals = assessment.behavioral_signals as Record<string, unknown>;

  const getRiskColor = (rating: string) => {
    return { low: 'var(--success)', moderate: 'var(--warning)', elevated: 'var(--danger)' }[rating] || 'var(--text-muted)';
  };

  return (
    <div>
      <div className="admin-header">
        <div>
          <button className="btn btn-outline" onClick={() => navigate('/')} style={{ marginBottom: 8 }}>
            &larr; Back to Sessions
          </button>
          <h1>Assessment Detail</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Session: {id}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowOverride(true)}>
          Override Decision
        </button>
      </div>

      {/* Section A: Risk Summary */}
      <div className="stats-grid">
        <div className="stat-card gauge-container">
          <div className="gauge-value" style={{ color: getRiskColor(riskRating) }}>
            {(pdScore * 100).toFixed(1)}%
          </div>
          <div className="gauge-label">Probability of Default</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: getRiskColor(riskRating) }}>
            {riskRating?.toUpperCase()}
          </div>
          <div className="stat-label">Risk Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>
            {String(assessment.money_profile || 'N/A')}
          </div>
          <div className="stat-label">Money Profile</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {assessment.decision === 'approved' ? (
              <span style={{ color: 'var(--success)' }}>APPROVE</span>
            ) : assessment.decision === 'declined' ? (
              <span style={{ color: 'var(--danger)' }}>DECLINE</span>
            ) : (
              <span style={{ color: 'var(--warning)' }}>REVIEW</span>
            )}
          </div>
          <div className="stat-label">Recommendation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Section B: OCEAN Trait Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">OCEAN Trait Breakdown</span>
            <span className="badge badge-info">
              {assessment.pd_phase1_only ? 'Blended' : 'Phase 1 Only'}
            </span>
          </div>
          <OceanChart scores={traitScores} />
        </div>

        {/* Section C: Loan Recommendation */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Loan Recommendation</span>
          </div>
          {loanRec ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Maximum Amount</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>${Number(loanRec.max_amount).toLocaleString()}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Duration</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(loanRec.duration_months)} months</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>APR</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{Number(loanRec.apr_percent)}%</div>
                </div>
              </div>
              {!!loanRec.admin_override && (
                <div style={{ marginTop: 12, padding: 8, background: 'rgba(245,158,11,0.1)', borderRadius: 6, fontSize: 12 }}>
                  <strong style={{ color: 'var(--warning)' }}>Admin Override</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{String(loanRec.override_justification)}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>By: {String(loanRec.reviewed_by)}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No recommendation generated</div>
          )}
        </div>
      </div>

      {/* Section D: Behavioral Signals */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Behavioral Signals (Phase 1)</span>
        </div>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-value">{Number(behavioralSignals?.avg_response_time_ms) || '-'}ms</div>
            <div className="stat-label">Avg Response Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Number(behavioralSignals?.changed_answer_count) ?? '-'}</div>
            <div className="stat-label">Changed Answers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Number(behavioralSignals?.total_hesitations) ?? '-'}</div>
            <div className="stat-label">Hesitations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{responses.length}</div>
            <div className="stat-label">Questions Answered</div>
          </div>
        </div>
      </div>

      {/* Phase 2 Panels (if behavioral data exists) */}
      {behavioral && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {/* Consistency Panel */}
            <ConsistencyPanel
              phase1Scores={assessment.trait_scores as Record<string, number>}
              phase2Scores={(behavioral.behavioral_scores || {}) as Record<string, number>}
              consistency={consistency}
            />

            {/* BART Score Card */}
            <BartScoreCard
              cargoLoads={(behavioral.cargo_loads || []) as Array<{ crates: number; tipped: boolean }>}
              bartScore={behavioral.bart_score as number}
            />
          </div>

          {/* Behavioral Heatmap */}
          <BehavioralHeatmap signals={behavioral} duration={behavioral.duration_ms as number} />
        </>
      )}

      {/* Section E: Admin Comments / Override */}
      {!!loanRec?.admin_comment && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">Admin Comments</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{String(loanRec.admin_comment)}</div>
        </div>
      )}

      {/* Override Modal */}
      {showOverride && assessment && (
        <OverrideModal
          assessmentId={assessment.id as string}
          currentDecision={assessment.decision as string}
          token={token}
          onClose={() => setShowOverride(false)}
          onOverridden={() => { setShowOverride(false); fetchDetail(); }}
        />
      )}
    </div>
  );
}
