// Supabase Edge Function: grade-picks
// Se dispara via cron cada 30 minutos en días de juego NFL
// Solo califica si hay juegos en progreso o recién terminados

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEASON = 2026

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const url = new URL(req.url)
    const weekParam = url.searchParams.get('week')
    const week = weekParam ? parseInt(weekParam) : getCurrentWeek()

    console.log(`Revisando juegos — Semana ${week}, Temporada ${SEASON}`)

    // 1. Obtiene todos los juegos de la semana desde ESPN
    const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${SEASON}`
    const espnRes = await fetch(espnUrl)
    const espnData = await espnRes.json()
    const events = espnData.events || []

    if (events.length === 0) {
      return respond({ message: 'No hay juegos esta semana', week })
    }

    // 2. Clasifica los juegos por estado
    const liveGames  = events.filter((e: any) => e.competitions[0].status.type.name === 'STATUS_IN_PROGRESS')
    const finalGames = events.filter((e: any) => e.competitions[0].status.type.name === 'STATUS_FINAL')

    console.log(`En vivo: ${liveGames.length} | Finalizados: ${finalGames.length}`)

    // Si no hay juegos en progreso ni finalizados, no hay nada que hacer
    if (liveGames.length === 0 && finalGames.length === 0) {
      return respond({ message: 'No hay juegos activos o finalizados aún', week })
    }

    // 3. Obtiene todos los grupos de esta temporada
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('season', SEASON)

    if (!groups || groups.length === 0) {
      return respond({ message: 'No hay grupos activos' })
    }

    let totalGraded = 0
    const results = []

    // 4. Califica solo los juegos FINALIZADOS (los en vivo esperan)
    for (const event of finalGames) {
      const comp     = event.competitions[0]
      const gameId   = event.id
      const winner   = comp.competitors.find((t: any) => t.winner)
      if (!winner) continue

      const winnerTeamId = winner.team.id
      const awayScore    = parseInt(comp.competitors.find((t: any) => t.homeAway === 'away')?.score || 0)
      const homeScore    = parseInt(comp.competitors.find((t: any) => t.homeAway === 'home')?.score || 0)
      const mnfTotal     = awayScore + homeScore
      const gameDate     = new Date(event.date)

      // Es Monday Night si el juego es el lunes
      // Es Thursday Night si el juego es el jueves
      const dayOfWeek = gameDate.getDay()
      const isSpecialGame = dayOfWeek === 1 || dayOfWeek === 4  // Lunes o Jueves

      for (const group of groups) {
        // Evita calificar dos veces el mismo juego
        const { data: existing } = await supabase
          .from('game_results')
          .select('id')
          .eq('group_id', group.id)
          .eq('game_id', gameId)
          .single()

        if (existing) continue

        // Guarda el resultado
        await supabase.from('game_results').insert({
          group_id:        group.id,
          game_id:         gameId,
          week,
          season:          SEASON,
          winner_team_id:  winnerTeamId,
          // Solo guarda el total para el Monday Night (desempate)
          mnf_actual_total: gameDate.getDay() === 1 ? mnfTotal : null,
        })

        // Obtiene todos los picks de este juego en este grupo
        const { data: picks } = await supabase
          .from('picks')
          .select('id, picked_team_id')
          .eq('group_id', group.id)
          .eq('game_id', gameId)
          .eq('week', week)
          .eq('season', SEASON)

        if (!picks || picks.length === 0) continue

        // Califica cada pick: 1 punto si acertó, 0 si no
        for (const pick of picks) {
          const isCorrect = pick.picked_team_id === winnerTeamId
          await supabase
            .from('picks')
            .update({
              is_correct:    isCorrect,
              points_earned: isCorrect ? 1 : 0,
            })
            .eq('id', pick.id)

          if (isCorrect) totalGraded++
        }

        results.push({
          gameId,
          winner:      winner.team.abbreviation,
          score:       `${awayScore}-${homeScore}`,
          total:       mnfTotal,
          isMNF:       gameDate.getDay() === 1,
          isThursday:  gameDate.getDay() === 4,
          picksGraded: picks.length,
        })
      }
    }

    return respond({
      success:          true,
      week,
      season:           SEASON,
      liveGames:        liveGames.length,
      finalGames:       finalGames.length,
      gamesGraded:      results.length,
      totalCorrect:     totalGraded,
      results,
    })

  } catch (error) {
    console.error('Error:', error)
    return respond({ error: error.message }, 500)
  }
})

function respond(data: object, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Calcula la semana actual de la temporada NFL 2026
// La temporada regular arranca el 10 de septiembre de 2026
function getCurrentWeek(): number {
  const seasonStart = new Date('2026-09-10')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24))
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, Math.min(18, week))
}
