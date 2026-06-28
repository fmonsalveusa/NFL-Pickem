import { useState, useEffect } from 'react'
import { getLeaderboard } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const MEDALS = ['🥇', '🥈', '🥉']
const SEASON = 2026

export default function LeaderboardPage({ groupId, groupName }) {
  const { user } = useAuth()
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [week, setWeek]     = useState(null)   // null = temporada completa

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    getLeaderboard(groupId, SEASON).then(({ data }) => {
      setRows(data || [])
      setLoading(false)
    })
  }, [groupId])

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div style={{ padding: '16px 0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          🏆 Tabla de posiciones
        </h2>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {groupName} · {SEASON}
        </span>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="page-loading" style={{ color: 'var(--text-3)' }}>
          Nadie ha hecho picks todavía
        </div>
      ) : (
        <div className="leaderboard-card">
          <div className="lb-header">
            <span>Jugador</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>Puntos</span>
          </div>

          {rows.map((row, i) => {
            const isMe = row.user_id === user?.id
            const isTied = rows[i - 1]?.total_points === row.total_points

            return (
              <div key={row.user_id} className={`lb-row ${isMe ? 'me' : ''}`}>
                <div className={`lb-rank ${i < 3 ? `r${i + 1}` : ''}`}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </div>
                <div
                  className="lb-avatar"
                  style={isMe ? { background: '#013369', color: '#fff' } : {}}
                >
                  {initials(row.full_name)}
                </div>
                <div className={`lb-name ${isMe ? 'me' : ''}`}>
                  {row.full_name}{isMe ? ' (tú)' : ''}
                </div>
                {isTied && (
                  <span className="lb-tie-badge">
                    TB {row.tiebreaker_diff != null ? `±${row.tiebreaker_diff}` : '?'}
                  </span>
                )}
                <span className="lb-pts">{row.total_points}</span>
                <span className="lb-pts-label">pts</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda de desempate */}
      <div style={{
        marginTop: 12, padding: '10px 14px',
        background: '#EFF6FF', borderRadius: 8,
        fontSize: 12, color: '#1D4ED8', lineHeight: 1.6
      }}>
        <strong>Desempate:</strong> cuando dos jugadores tienen los mismos puntos al final de la semana,
        gana el que predijo el total de puntos del Monday Night más cercano al resultado real.
        El número TB±N muestra qué tan lejos quedó tu predicción.
      </div>
    </div>
  )
}
