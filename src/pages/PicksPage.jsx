import { useState, useEffect, useCallback } from 'react'
import { fetchNFLGames, getWeekPicks, savePick } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import GameCard from '../components/GameCard/GameCard'

// Semana actual de la temporada 2026 (ajusta según la fecha real)
const CURRENT_WEEK   = 1
const CURRENT_SEASON = 2026
const TOTAL_WEEKS    = 18

export default function PicksPage({ groupId, groupName }) {
  const { user } = useAuth()

  const [week, setWeek]             = useState(CURRENT_WEEK)
  const [games, setGames]           = useState([])
  const [picks, setPicks]           = useState({})       // { gameId: { pickedTeamId, tiebreakerTotal } }
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [deadlineStr, setDeadline]  = useState('')

  // Carga juegos de ESPN + picks del usuario
  const loadWeek = useCallback(async () => {
    setLoading(true)
    try {
      const [gamesData] = await Promise.all([
        fetchNFLGames(week, CURRENT_SEASON),
      ])
      setGames(gamesData)

      // Fecha del primer juego de la semana = deadline
      if (gamesData.length > 0) {
        const firstGame = new Date(gamesData[0].date)
        setDeadline(firstGame.toLocaleString('es-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        }))
      }

      // Picks del usuario para esta semana
      if (user && groupId) {
        const { data } = await getWeekPicks(user.id, groupId, week, CURRENT_SEASON)
        const picksMap = {}
        data?.forEach(p => {
          picksMap[p.game_id] = {
            pickedTeamId: p.picked_team_id,
            tiebreakerTotal: p.tiebreaker_total,
          }
        })
        setPicks(picksMap)
      }
    } catch (err) {
      console.error('Error cargando semana:', err)
    } finally {
      setLoading(false)
    }
  }, [week, user, groupId])

  useEffect(() => { loadWeek() }, [loadWeek])

  // Calcula distribución de picks del grupo para la barra de %
  // TODO: conectar con datos reales de Supabase
  const getGroupPcts = (gameId) => {
    // Por ahora retorna 50/50 como placeholder
    // En producción: query a picks de todos los miembros del grupo
    return { awayPct: 50, homePct: 50 }
  }

  // Puntos del juego (CBS usa escala decreciente: más picks → menos puntos)
  const getPoints = (gameId, index) => {
    // Escala simple: el juego 1 vale más puntos, el último menos
    const base = games.length - index
    return Math.max(1, base) * 2
  }

  // Identifica el Monday Night game (tiebreaker)
  const mondayGame = games.find(g => g.isMondayNight)

  // Maneja selección de pick
  const handlePick = async (gameId, teamId) => {
    // Toggle: si ya tenía ese equipo, deselecciona
    const current = picks[gameId]
    const newPick = current?.pickedTeamId === teamId ? null : { pickedTeamId: teamId, tiebreakerTotal: current?.tiebreakerTotal }

    setPicks(prev => ({ ...prev, [gameId]: newPick }))
  }

  // Maneja tiebreaker
  const handleTiebreaker = (gameId, total) => {
    setPicks(prev => ({
      ...prev,
      [gameId]: { ...prev[gameId], tiebreakerTotal: total }
    }))
  }

  // Guarda todos los picks
  const saveAllPicks = async () => {
    if (!user || !groupId) return
    setSaving(true)

    const promises = games
      .filter(g => picks[g.id]?.pickedTeamId)
      .map(g =>
        savePick({
          userId: user.id,
          groupId,
          gameId: g.id,
          week,
          season: CURRENT_SEASON,
          pickedTeamId: picks[g.id].pickedTeamId,
          tiebreakerTotal: picks[g.id]?.tiebreakerTotal || null,
        })
      )

    await Promise.all(promises)
    setSaving(false)
    showToast('✓ Picks guardados')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Stats del header
  const totalGames     = games.length
  const pickedCount    = Object.values(picks).filter(p => p?.pickedTeamId).length
  const finalGames     = games.filter(g => g.isFinal)
  const correctPicks   = finalGames.filter(g => {
    const p = picks[g.id]
    if (!p?.pickedTeamId) return false
    const winner = p.pickedTeamId === g.away.id ? g.away.winner : g.home.winner
    return winner
  }).length

  return (
    <div>
      {/* Header de semana */}
      <div className="week-header">
        <div className="week-controls">
          <button
            className="week-btn"
            onClick={() => setWeek(w => Math.max(1, w - 1))}
            disabled={week === 1}
            aria-label="Semana anterior"
          >‹</button>
          <span className="week-label">Semana {week}</span>
          <button
            className="week-btn"
            onClick={() => setWeek(w => Math.min(TOTAL_WEEKS, w + 1))}
            disabled={week === TOTAL_WEEKS}
            aria-label="Semana siguiente"
          >›</button>
        </div>
        {deadlineStr && (
          <span className="deadline-badge">
            Cierra {deadlineStr}
          </span>
        )}
      </div>

      {/* Barra resumen */}
      <div className="summary-bar">
        <div className="summary-side">Away</div>
        <div className="summary-center">
          <div className="summary-picks">
            {pickedCount}/{totalGames} Picks
          </div>
          {finalGames.length > 0 && (
            <div className="summary-correct">{correctPicks} correctos esta semana</div>
          )}
        </div>
        <div className="summary-side right">Home</div>
      </div>

      {/* Juegos */}
      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
          Cargando juegos...
        </div>
      ) : games.length === 0 ? (
        <div className="page-loading" style={{ color: 'var(--text-3)' }}>
          No hay juegos programados para esta semana
        </div>
      ) : (
        games.map((game, idx) => (
          <GameCard
            key={game.id}
            game={game}
            userPick={picks[game.id] || null}
            groupPcts={getGroupPcts(game.id)}
            points={getPoints(game.id, idx)}
            isTiebreaker={game.isMondayNight}
            onPick={(teamId) => handlePick(game.id, teamId)}
            onTiebreaker={(total) => handleTiebreaker(game.id, total)}
            disabled={game.isLocked}
          />
        ))
      )}

      {/* Submit bar */}
      {!loading && pickedCount > 0 && (
        <div className="submit-bar">
          <div className="submit-info">
            <strong>{pickedCount}</strong> de {totalGames} picks listos
            {mondayGame && !picks[mondayGame.id]?.tiebreakerTotal && pickedCount > 0 && (
              <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>· Falta desempate MNF</span>
            )}
          </div>
          <button
            className="btn btn-primary btn-pill"
            onClick={saveAllPicks}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar picks'}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
