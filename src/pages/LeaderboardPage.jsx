import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const MEDALS = ['🥇', '🥈', '🥉']
const SEASON = 2026

export default function LeaderboardPage({ groupId, groupName }) {
  const { user } = useAuth()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [flash, setFlash]     = useState(false)  // animación cuando hay cambio

  const loadLeaderboard = async () => {
    if (!groupId) return

    // Calcula puntos directamente desde picks (sin depender de la vista)
    const { data, error } = await supabase
      .from('picks')
      .select(`
        user_id,
        is_correct,
        points_earned,
        tiebreaker_total,
        profiles (full_name)
      `)
      .eq('group_id', groupId)
      .eq('season', SEASON)
      .not('is_correct', 'is', null)  // solo picks ya calificados

    if (error) { console.error(error); return }

    // Agrupa por usuario y suma puntos
    const userMap = {}
    for (const pick of data || []) {
      const uid = pick.user_id
      if (!userMap[uid]) {
        userMap[uid] = {
          user_id:   uid,
          full_name: pick.profiles?.full_name || 'Usuario',
          total_points: 0,
          correct_picks: 0,
          graded_picks:  0,
          tiebreaker_total: pick.tiebreaker_total,
        }
      }
      userMap[uid].total_points  += pick.points_earned || 0
      userMap[uid].graded_picks  += 1
      if (pick.is_correct) userMap[uid].correct_picks += 1
    }

    // Ordena por puntos desc, luego por tiebreaker
    const sorted = Object.values(userMap).sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      // Desempate: quien predijo el total del MNF más cercano
      return (a.tiebreaker_diff || 999) - (b.tiebreaker_diff || 999)
    })

    setRows(sorted)
    setLoading(false)
    setLastUpdate(new Date())
  }

  useEffect(() => {
    loadLeaderboard()

    // Suscripción Realtime — se actualiza automáticamente cuando se califican picks
    const channel = supabase
      .channel(`leaderboard-${groupId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'picks',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          console.log('Pick actualizado:', payload)
          // Recarga el leaderboard y muestra animación
          loadLeaderboard()
          setFlash(true)
          setTimeout(() => setFlash(false), 1500)
        }
      )
      .subscribe()

    // Limpia la suscripción al salir
    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div style={{ padding: '16px 0 12px', display: 'flex', alignItems: 'center' }}>
        <h2 className="section-title" style={{ margin: 0, flex: 1 }}>
          🏆 Tabla de posiciones
        </h2>
        {/* Indicador de tiempo real */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: flash ? '#16a34a' : '#22c55e',
            boxShadow: flash ? '0 0 8px #16a34a' : 'none',
            transition: 'all 0.3s',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {flash ? '¡Actualizado!' : 'En vivo'}
          </span>
        </div>
      </div>

      {lastUpdate && (
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
          Última actualización: {lastUpdate.toLocaleTimeString('es-US')}
        </p>
      )}

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p>Aún no hay picks calificados.</p>
          <p style={{ marginTop: 4, fontSize: 13 }}>
            El leaderboard se actualiza automáticamente cuando terminan los juegos.
          </p>
        </div>
      ) : (
        <div className="leaderboard-card" style={{
          transition: 'box-shadow 0.3s',
          boxShadow: flash ? '0 0 0 2px #22c55e' : 'var(--shadow-sm)'
        }}>
          <div className="lb-header">
            <span>Jugador</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
              {groupName} · {SEASON}
            </span>
          </div>

          {rows.map((row, i) => {
            const isMe   = row.user_id === user?.id
            const isTied = rows[i - 1]?.total_points === row.total_points

            return (
              <div
                key={row.user_id}
                className={`lb-row ${isMe ? 'me' : ''}`}
                style={{
                  transition: 'background 0.5s',
                  background: flash && isMe ? '#dcfce7' : undefined,
                }}
              >
                <div className={`lb-rank ${i < 3 ? `r${i + 1}` : ''}`}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </div>
                <div className="lb-avatar" style={isMe ? { background: '#013369', color: '#fff' } : {}}>
                  {initials(row.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`lb-name ${isMe ? 'me' : ''}`}>
                    {row.full_name}{isMe ? ' (tú)' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {row.correct_picks} correctos de {row.graded_picks} jugados
                  </div>
                </div>
                {isTied && (
                  <span className="lb-tie-badge">Empate</span>
                )}
                <div style={{ textAlign: 'right' }}>
                  <span className="lb-pts">{row.total_points}</span>
                  <span className="lb-pts-label"> pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda */}
      <div style={{
        marginTop: 12, padding: '10px 14px',
        background: '#EFF6FF', borderRadius: 8,
        fontSize: 12, color: '#1D4ED8', lineHeight: 1.6
      }}>
        <strong>⚡ Tiempo real:</strong> el leaderboard se actualiza automáticamente
        cada vez que termina un juego, sin necesidad de recargar la página.
        <br/>
        <strong>Desempate:</strong> si dos jugadores tienen los mismos puntos,
        gana el que predijo el total del Monday Night más cercano al resultado real.
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
