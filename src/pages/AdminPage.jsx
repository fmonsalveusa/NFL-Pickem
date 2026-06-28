import { useState, useEffect } from 'react'
import { supabase, markAsPaid } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminPage({ group }) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [week, setWeek]       = useState(1)
  const [weekPicks, setWeekPicks] = useState([])

  const isAdmin = group?.admin_id === user?.id

  useEffect(() => {
    if (!group || !isAdmin) return
    loadMembers()
  }, [group])

  useEffect(() => {
    if (!group || !isAdmin) return
    loadWeekPicks()
  }, [week, group])

  const loadMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select(`
        id, paid, user_id,
        profiles (full_name, email)
      `)
      .eq('group_id', group.id)
    setMembers(data || [])
    setLoading(false)
  }

  const loadWeekPicks = async () => {
    const { data } = await supabase
      .from('picks')
      .select('user_id, game_id, picked_team_id, is_correct, points_earned, tiebreaker_total')
      .eq('group_id', group.id)
      .eq('week', week)
      .eq('season', 2026)
    setWeekPicks(data || [])
  }

  const togglePaid = async (memberId, current) => {
    await markAsPaid(memberId, !current)
    setMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, paid: !current } : m)
    )
  }

  // Marcar resultado de juego manualmente (si ESPN no lo actualiza)
  const setGameResult = async (gameId, winnerTeamId) => {
    // Actualiza todos los picks de este juego en el grupo
    const { error } = await supabase.rpc('set_game_result', {
      p_group_id: group.id,
      p_game_id: gameId,
      p_winner_team_id: winnerTeamId,
      p_week: week,
      p_season: 2026,
    })
    if (!error) loadWeekPicks()
  }

  if (!isAdmin) {
    return (
      <div className="page-loading" style={{ color: 'var(--text-3)' }}>
        Solo el administrador del grupo puede ver esta sección.
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '16px 0 12px' }}>
        <h2 className="section-title">⚙️ Admin — {group?.name}</h2>
      </div>

      {/* Código de invitación */}
      <div className="group-card" style={{ cursor: 'default' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Código de invitación</div>
        <div className="invite-code-box">
          <div className="invite-code">{group?.invite_code}</div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(`${import.meta.env.VITE_APP_URL}/join/${group.invite_code}`)
            }}
          >
            Copiar link
          </button>
        </div>
      </div>

      {/* Miembros y pagos */}
      <div style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>
          👥 Participantes ({members.length})
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="leaderboard-card">
            {members.map((m) => (
              <div key={m.id} className="lb-row">
                <div className="lb-avatar">
                  {(m.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {m.profiles?.full_name || 'Usuario'}
                    {m.user_id === group.admin_id && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--nfl-blue)', fontWeight: 500 }}>
                        Admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.profiles?.email}</div>
                </div>
                <button
                  className={`paid-badge ${m.paid ? 'yes' : 'no'}`}
                  style={{ border: 'none', cursor: 'pointer' }}
                  onClick={() => togglePaid(m.id, m.paid)}
                >
                  {m.paid ? 'Pagado ✓' : 'Marcar pagado'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
          Entry fee acordado: <strong>${group?.entry_fee || '0'}</strong> por persona.
          Cobra por Zelle o Venmo y marca aquí quién pagó.
        </p>
      </div>

      {/* Resumen por semana */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div className="section-title" style={{ fontSize: 14, margin: 0, flex: 1 }}>
            📊 Picks semana
          </div>
          <div className="week-controls">
            <button className="week-btn" onClick={() => setWeek(w => Math.max(1, w-1))} disabled={week===1}>‹</button>
            <span className="week-label" style={{ fontSize: 13 }}>Sem {week}</span>
            <button className="week-btn" onClick={() => setWeek(w => Math.min(18, w+1))}>›</button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {weekPicks.length === 0 ? (
            <p style={{ color: 'var(--text-3)' }}>Nadie ha hecho picks esta semana todavía.</p>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {members.map(m => {
                const userPicks = weekPicks.filter(p => p.user_id === m.user_id)
                const correct = userPicks.filter(p => p.is_correct).length
                const total   = userPicks.length
                const pts     = userPicks.reduce((s, p) => s + (p.points_earned || 0), 0)
                return (
                  <div key={m.id} className="lb-row">
                    <div style={{ fontSize: 13, flex: 1 }}>
                      {m.profiles?.full_name || 'Usuario'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {total} picks · {correct} correctos
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginLeft: 10 }}>
                      {pts} pts
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
