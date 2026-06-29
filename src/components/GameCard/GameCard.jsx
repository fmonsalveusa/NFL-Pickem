import { useState } from 'react'
import { teamLogo } from '../../lib/teams'

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
  const [tbTotal, setTbTotal] = useState('')

  if (!game) return null

  const { away, home, isLocked, isFinal, isLive, broadcast } = game

  const pickedAway = userPick?.pickedTeamId === away.id
  const pickedHome = userPick?.pickedTeamId === home.id

  const awayCorrect = isFinal && away.winner && pickedAway
  const awayWrong   = isFinal && !away.winner && pickedAway
  const homeCorrect = isFinal && home.winner && pickedHome
  const homeWrong   = isFinal && !home.winner && pickedHome

  const handleClick = (e) => {
    if (isLocked || disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const side = x < rect.width / 2 ? 'away' : 'home'
    const teamId = side === 'away' ? away.id : home.id
    onPick?.(teamId, side)
  }

  const badgeClass = () => {
    if (awayCorrect || homeCorrect) return 'pick-badge correct'
    if (awayWrong || homeWrong)     return 'pick-badge wrong'
    if (pickedAway || pickedHome)   return 'pick-badge selected'
    return 'pick-badge open'
  }

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

  const sideStyle = (isAway, team) => {
    const picked  = isAway ? pickedAway : pickedHome
    const correct = isAway ? awayCorrect : homeCorrect
    if (picked || correct) return { backgroundColor: team.color }
    return {}
  }

  // Texto blanco cuando el lado está seleccionado o es correcto
  const textStyle = (isAway) => {
    const picked  = isAway ? pickedAway : pickedHome
    const correct = isAway ? awayCorrect : homeCorrect
    return (picked || correct) ? { color: '#fff' } : {}
  }

  const recordStyle = (isAway) => {
    const picked  = isAway ? pickedAway : pickedHome
    const correct = isAway ? awayCorrect : homeCorrect
    return (picked || correct) ? { color: 'rgba(255,255,255,0.7)' } : {}
  }

  const gameTime = () => {
    if (isFinal) return null
    const d = new Date(game.date)
    const formatted = d.toLocaleString('es-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    })
    // Capitaliza primera letra de cada palabra (Dom, Sept, etc.)
    return formatted.replace(/\b\w/g, l => l.toUpperCase())
  }

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
              src={teamLogo(away.abbr)}
              alt={away.fullName}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
          <div className="team-info">
            <div className="team-name" style={textStyle(true)}>
              {away.name?.toUpperCase()}
            </div>
            <div className="team-record" style={recordStyle(true)}>{away.record}</div>
          </div>
        </div>

        {/* Centro */}
        <div className="center-col">
          <div className="pct-bar">
            <div className="pct-away" style={{ width: `${groupPcts.awayPct}%`, backgroundColor: away.color, opacity: 0.2 }} />
            <div className="pct-home" style={{ backgroundColor: home.color, opacity: 0.2 }} />
          </div>
          <div className={badgeClass()}>
            {(awayCorrect || homeCorrect) && <span className="pick-badge-icon">✓</span>}
            {(awayWrong   || homeWrong)   && <span className="pick-badge-icon">✗</span>}
            <span className="pick-badge-pts">
              {(pickedAway || pickedHome || awayCorrect || homeCorrect || awayWrong || homeWrong)
                ? `${points} pts` : 'Pick'}
            </span>
          </div>
          <div className="pct-labels">
            <span className="pct-label">{groupPcts.awayPct}%</span>
            <span className="pct-label">{groupPcts.homePct}%</span>
          </div>
        </div>

        {/* Home */}
        <div className={sideClass(false)} style={sideStyle(false, home)}>
          <div className="team-watermark">{home.city}</div>
          <div className="team-info">
            <div className="team-name" style={textStyle(false)}>
              {home.name?.toUpperCase()}
            </div>
            <div className="team-record" style={recordStyle(false)}>{home.record}</div>
          </div>
          <div className="team-logo-wrap">
            <img
              className="team-logo"
              src={teamLogo(home.abbr)}
              alt={home.fullName}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        </div>

      </div>

      {/* Tiebreaker — Monday Night */}
      {isTiebreaker && !isLocked && (
        <div className="tiebreaker-card" style={{ margin: 0, borderRadius: 0, border: 'none', borderTop: '1px solid #E2E5E9' }}>
          <div className="tb-header">
            <span className="tb-badge">Desempate</span>
            <span className="tb-subtitle">{away.name} vs {home.name}</span>
          </div>
          <p className="tb-desc">
            Predice el total de puntos combinado. Gana el que más se acerque al marcador real.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={teamLogo(away.abbr)} alt={away.abbr} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <img src={teamLogo(home.abbr)} alt={home.abbr} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Total de puntos combinado</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="tb-input"
                  type="number"
                  min="0" max="150" step="1"
                  placeholder="ej: 47"
                  value={tbTotal}
                  onChange={(e) => {
                    setTbTotal(e.target.value)
                    onTiebreaker?.(parseInt(e.target.value) || null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Total de puntos combinado"
                  style={{ width: 80, fontSize: 20, fontWeight: 700 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>puntos totales</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
