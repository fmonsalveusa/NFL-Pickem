import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { teamLogo } from '../lib/teams'

const SEASON = 2026

export default function GroupPicksPage({ groupId, groupName }) {
  const { user } = useAuth()
  const [week, setWeek]       = useState(1)
  const [games, setGames]     = useState([])
  const [members, setMembers] = useState([])
  const [allPicks, setAllPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [kickoffPassed, setKickoffPassed] = useState(false)

  useEffect(() => { loadData() }, [week, groupId])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Juegos de ESPN
      const espnRes = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${SEASON}`
      )
      const espnData = await espnRes.json()
      const events = (espnData.events || []).map((event) => {
        const comp = event.competitions[0]
        const away = comp.competitors.find(t => t.homeAway === 'away')
        const home = comp.competitors.find(t => t.homeAway === 'home')
        const status = comp.status.type.name
        return {
          id: event.id,
          date: event.date,
          status,
          isLocked: status !== 'STATUS_SCHEDULED',
          isFinal: status === 'STATUS_FINAL',
          away: {
            id: away.team.id,
            abbr: away.team.abbreviation,
            name: away.team.shortDisplayName,
            score: parseInt(away.score) || 0,
            winner: away.winner,
          },
          home: {
            id: home.team.id,
            abbr: home.team.abbreviation,
            name: home.team.shortDisplayName,
            score: parseInt(home.score) || 0,
            winner: home.winner,
          },
        }
      })
      setGames(events)

      // Detecta si ya pasó el kickoff del primer juego
      const firstGame = events[0]
      const kicked = firstGame ? new Date(firstGame.date) <= new Date() : false
      setKickoffPassed(kicked)

      // 2. Miembros del grupo
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, profiles (full_name)')
        .eq('group_id', groupId)
      setMembers(membersData || [])

      // 3. Picks de todos (solo si ya pasó el kickoff)
      if (kicked) {
        const { data: picksData } = await supabase
          .from('picks')
          .select('user_id, game_id, picked_team_id, is_correct, points_earned')
          .eq('group_id', groupId)
          .eq('week', week)
          .eq('season', SEASON)
        setAllPicks(picksData || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Obtiene el pick de un usuario para un juego
  const getPick = (userId, gameId) =>
    allPicks.find(p => p.user_id === userId && p.game_id === gameId)

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div style={{ padding: '16px 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 className="section-title" style={{ margin: 0, flex: 1 }}>
          👥 Picks del grupo
        </h2>
        <div className="week-controls">
          <button className="week-btn" onClick={() => setWeek(w => Math.max(1, w-1))} disabled={week===1}>‹</button>
          <span className="week-label" style={{ fontSize: 13 }}>Sem {week}</span>
          <button className="week-btn" onClick={() => setWeek(w => Math.min(18, w+1))}>›</button>
        </div>
      </div>

      {/* Aviso si aún no pasó el kickoff */}
      {!kickoffPassed && !loading && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #FDE68A',
          borderRadius: 10, padding: '14px 16px', marginBottom: 12,
          fontSize: 13, color: '#92400E', lineHeight: 1.6
        }}>
          🔒 <strong>Los picks están ocultos</strong> hasta que empiece el primer juego de la semana.
          Esto es para que nadie pueda influenciarse por los picks de otros participantes.
        </div>
      )}

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : kickoffPassed ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: 'var(--surface)', borderRadius: 12,
            overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            fontSize: 12,
          }}>
            {/* Header con nombres de participantes */}
            <thead>
              <tr style={{ background: 'var(--nfl-blue)', color: '#fff' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, minWidth: 120 }}>
                  Juego
                </th>
                {members.map(m => (
                  <th key={m.user_id} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, minWidth: 70 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: m.user_id === user?.id ? '#D97706' : 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700
                      }}>
                        {initials(m.profiles?.full_name)}
                      </div>
                      <span style={{ fontSize: 10, opacity: 0.85 }}>
                        {m.profiles?.full_name?.split(' ')[0]}
                        {m.user_id === user?.id ? ' (tú)' : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Filas de juegos */}
            <tbody>
              {games.map((game, idx) => (
                <tr key={game.id} style={{
                  borderBottom: '1px solid var(--border)',
                  background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'
                }}>
                  {/* Juego */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <img src={teamLogo(game.away.abbr)} alt={game.away.abbr} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                      <span style={{ fontWeight: 600, color: game.away.winner ? 'var(--text-1)' : 'var(--text-3)' }}>
                        {game.away.name}
                      </span>
                      {game.isFinal && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {game.away.score}-{game.home.score}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <img src={teamLogo(game.home.abbr)} alt={game.home.abbr} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                      <span style={{ fontWeight: 600, color: game.home.winner ? 'var(--text-1)' : 'var(--text-3)' }}>
                        {game.home.name}
                      </span>
                    </div>
                    {game.isFinal && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>FINAL</div>
                    )}
                  </td>

                  {/* Pick de cada participante */}
                  {members.map(m => {
                    const pick = getPick(m.user_id, game.id)
                    if (!pick) return (
                      <td key={m.user_id} style={{ textAlign: 'center', padding: 8 }}>
                        <span style={{ color: 'var(--text-3)', fontSize: 16 }}>—</span>
                      </td>
                    )

                    const pickedAway = pick.picked_team_id === game.away.id
                    const team = pickedAway ? game.away : game.home

                    // Color del resultado
                    let bg = 'transparent', color = 'var(--text-1)', icon = ''
                    if (pick.is_correct === true)  { bg = '#DCFCE7'; color = '#15803D'; icon = '✓' }
                    if (pick.is_correct === false) { bg = '#FEE2E2'; color = '#B91C1C'; icon = '✗' }

                    return (
                      <td key={m.user_id} style={{ textAlign: 'center', padding: 6 }}>
                        <div style={{
                          display: 'inline-flex', flexDirection: 'column',
                          alignItems: 'center', gap: 2,
                          background: bg, borderRadius: 8,
                          padding: '4px 6px', minWidth: 50,
                        }}>
                          <img
                            src={teamLogo(team.abbr)}
                            alt={team.abbr}
                            style={{ width: 22, height: 22, objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 600, color }}>
                            {icon} {team.name}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            {/* Footer con totales */}
            <tfoot>
              <tr style={{ background: '#EFF6FF', borderTop: '2px solid var(--nfl-blue)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13, color: 'var(--nfl-blue)' }}>
                  Total correctos
                </td>
                {members.map(m => {
                  const userPicks = allPicks.filter(p => p.user_id === m.user_id)
                  const correct = userPicks.filter(p => p.is_correct).length
                  const total   = userPicks.filter(p => p.is_correct !== null).length
                  return (
                    <td key={m.user_id} style={{ textAlign: 'center', padding: '10px 8px' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--nfl-blue)' }}>
                        {correct}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/{total}</span>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>
            Picks ocultos hasta el kickoff
          </p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            {games[0] ? `Primer juego: ${new Date(games[0].date).toLocaleString('es-US', {
              weekday: 'long', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit'
            })}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
