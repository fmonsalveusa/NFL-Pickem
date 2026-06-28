import { useState } from 'react'

/**
 * GameCard — réplica del estilo CBS Pick'Em
 * Props:
 *   game        — objeto con datos del partido (ver lib/supabase.js fetchNFLGames)
 *   userPick    — { pickedTeamId, tiebreakerTotal } | null
 *   groupPcts   — { awayPct: number, homePct: number } porcentaje de picks del grupo
 *   points      — puntos asignados a este juego
 *   isTiebreaker— boolean, es el Monday Night game
 *   onPick      — fn(teamId, side) llamada cuando el usuario selecciona
 *   onTiebreaker— fn(total) llamada cuando cambia el desempate
 *   disabled    — boolean (juego ya empezó, no se puede cambiar)
 */
export default function GameCard({
  game,
  userPick = null,
  groupPcts = { awayPct: 50, homePct: 50 },
  points = 10,
  isTiebreaker = false,
  onPick,
  onTiebreaker,
  disabled = false,
}) {
  const [tbAway, setTbAway] = useState('')
  const [tbHome, setTbHome] = useState('')

  if (!game) return null

  const { away, home, isLocked, isFinal, isLive, status, broadcast, date } = game

  const pickedAway = userPick?.pickedTeamId === away.id
  const pickedHome = userPick?.pickedTeamId === home.id

  // Estado visual de cada lado después de que el juego terminó
  const awayCorrect = isFinal && away.winner && pickedAway
  const awayWrong   = isFinal && !away.winner && pickedAway
  const homeCorrect = isFinal && home.winner && pickedHome
  const homeWrong   = isFinal && !home.winner && pickedHome

  const handleClick = (e) => {
    if (isLocked || disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    // Determina si clickeó lado away o home según posición X
    const side = x < rect.width / 2 ? 'away' : 'home'
    const teamId = side === 'away' ? away.id : home.id
    onPick?.(teamId, side)
  }

  // Clase del badge central
  const badgeClass = () => {
    if (awayCorrect || homeCorrect) return 'pick-badge correct'
    if (awayWrong || homeWrong)     return 'pick-badge wrong'
    if (pickedAway || pickedHome)   return 'pick-badge selected'
    return 'pick-badge open'
  }

  // Clase de lado del equipo
  const sideClass = (isAway) => {
    const base = `team-side ${isAway ? 'away' : 'home'}`
    if (isAway) {
      if (awayCorrect) return base + ' correct'
      if (awayWrong)   return base + ' wrong'
      if (pickedAway)  return base + ' selected'
    } else {
      if (homeCorrect) return base + ' correct'
      if (homeWrong)   return base + ' wrong'
      if (pickedHome)  return base + ' selected'
    }
    return base
  }

  // Color de fondo sólido cuando está seleccionado
  const sideStyle = (isAway, team) => {
    const picked = isAway ? pickedAway : pickedHome
    const correct = isAway ? awayCorrect : homeCorrect
    if (picked || correct) {
      return { backgroundColor: team.color }
    }
    return {}
  }

  // Formato de fecha/hora
  const gameTime = () => {
    if (isFinal) return null
    const d = new Date(game.date)
    return d.toLocaleString('es-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    })
  }

  const tbTotal = tbAway && tbHome
    ? parseInt(tbAway) + parseInt(tbHome)
    : null

  return (
    <div
      className="game-card"
      data-locked={isLocked ? 'true' : undefined}
      onClick={!isLocked ? handleClick : undefined}
    >
      {/* Score / estado */}
      <div className="game-score-row">
        {isFinal || isLive ? (
          <>
            <span className={`game-score ${away.winner ? 'winner' : ''}`}>{away.score}</span>
            <span className={`game-status-chip ${isLive ? 'live' : ''}`}>
              {isLive ? `Q${game.period} ${game.displayClock}` : 'Final'}
              {game.displayStatus === 'Final/OT' ? '/OT' : ''}
            </span>
            <span className={`game-score ${home.winner ? 'winner' : ''}`}>{home.score}</span>
          </>
        ) : (
          <span className={`game-status-chip ${isTiebreaker ? 'mnf' : ''}`}>
            {isTiebreaker ? '🏈 Monday Night · ' : ''}{gameTime()} {broadcast && `· ${broadcast}`}
          </span>
        )}
      </div>

      {/* Equipos */}
      <div className="teams-row">
        {/* Away */}
        <div className={sideClass(true)} style={sideStyle(true, away)}>
          <div className="team-watermark">{away.city}</div>
          <div className="team-logo-wrap">
            <img
              className="team-logo"
              src={away.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${away.abbr?.toLowerCase()}.png`}
              alt={away.fullName}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
          <div className="team-info">
            <div className="team-name">
              <span className="team-abbr">{away.abbr}</span>
              <span className="team-record-text">{away.record}</span>
            </div>
            {!isFinal && <div className="team-record">Visitante</div>}
          </div>
        </div>

        {/* Centro: barra % + badge */}
        <div className="center-col">
          {/* Barra de porcentaje del grupo */}
          <div className="pct-bar">
            <div
              className="pct-away"
              style={{
                width: `${groupPcts.awayPct}%`,
                backgroundColor: away.color,
                opacity: 0.2,
              }}
            />
            <div
              className="pct-home"
              style={{ backgroundColor: home.color, opacity: 0.2 }}
            />
          </div>

          {/* Badge de puntos */}
          <div className={badgeClass()}>
            {(awayCorrect || homeCorrect) && (
              <span className="pick-badge-icon">✓</span>
            )}
            {(awayWrong || homeWrong) && (
              <span className="pick-badge-icon">✗</span>
            )}
            <span className="pick-badge-pts">
              {(pickedAway || pickedHome || awayCorrect || homeCorrect || awayWrong || homeWrong)
                ? `${points} pts`
                : 'Pick'}
            </span>
          </div>

          {/* Porcentajes */}
          <div className="pct-labels">
            <span className="pct-label">{groupPcts.awayPct}%</span>
            <span className="pct-label">{groupPcts.homePct}%</span>
          </div>
        </div>

        {/* Home */}
        <div className={sideClass(false)} style={sideStyle(false, home)}>
          <div className="team-watermark">{home.city}</div>
          <div className="team-info">
            <div className="team-name">
              <span className="team-abbr">{home.abbr}</span>
              <span className="team-record-text">{home.record}</span>
            </div>
            {!isFinal && <div className="team-record">Local</div>}
          </div>
          <div className="team-logo-wrap">
            <img
              className="team-logo"
              src={home.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${home.abbr?.toLowerCase()}.png`}
              alt={home.fullName}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Módulo de desempate — solo en Monday Night */}
      {isTiebreaker && !isLocked && (
        <div className="tiebreaker-card" style={{ margin: '0', borderRadius: '0', border: 'none', borderTop: '1px solid #E2E5E9' }}>
          <div className="tb-header">
            <span className="tb-badge">Desempate</span>
            <span className="tb-subtitle">Predice el marcador total combinado</span>
          </div>
          <p className="tb-desc">
            Si terminas empatado en puntos con otro jugador, el que haya predicho el total más cercano al marcador real gana.
          </p>
          <div className="tb-inputs-row">
            <div className="tb-team">
              <img
                src={away.logo}
                alt={away.abbr}
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
              <span className="tb-team-name">{away.name}</span>
            </div>
            <input
              className="tb-input"
              type="number"
              min="0" max="99"
              placeholder="0"
              value={tbAway}
              onChange={(e) => {
                setTbAway(e.target.value)
                const total = parseInt(e.target.value || 0) + parseInt(tbHome || 0)
                onTiebreaker?.(total)
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Puntos ${away.name}`}
            />
            <span className="tb-separator">–</span>
            <input
              className="tb-input"
              type="number"
              min="0" max="99"
              placeholder="0"
              value={tbHome}
              onChange={(e) => {
                setTbHome(e.target.value)
                const total = parseInt(tbAway || 0) + parseInt(e.target.value || 0)
                onTiebreaker?.(total)
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Puntos ${home.name}`}
            />
            <div className="tb-team right">
              <span className="tb-team-name">{home.name}</span>
              <img
                src={home.logo}
                alt={home.abbr}
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
            </div>
          </div>
          {tbTotal !== null && (
            <p className="tb-total">
              Total predicho: <strong>{tbTotal} pts</strong>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
