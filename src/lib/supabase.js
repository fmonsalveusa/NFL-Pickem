import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Auth helpers ──────────────────────────────────────────────────────────────

export const signUp = (email, password, name) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

// ── Grupos ────────────────────────────────────────────────────────────────────

export const createGroup = async ({ name, entryFee, season, adminId }) => {
  // Genera código único de invitación de 8 chars
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data, error } = await supabase
    .from('groups')
    .insert({ name, entry_fee: entryFee, season, admin_id: adminId, invite_code: inviteCode })
    .select()
    .single()

  return { data, error }
}

export const joinGroup = async (inviteCode, userId) => {
  // Busca el grupo por código
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()

  if (gErr) return { error: { message: 'Código de grupo inválido' } }

  // Agrega al usuario como miembro
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, paid: false })
    .select()
    .single()

  return { data: { ...data, group }, error }
}

export const getUserGroups = (userId) =>
  supabase
    .from('group_members')
    .select(`
      paid,
      groups (id, name, entry_fee, season, invite_code, admin_id)
    `)
    .eq('user_id', userId)

// ── Juegos NFL (via ESPN API pública) ─────────────────────────────────────────

export const fetchNFLGames = async (week, season = 2026) => {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=2&dates=${season}`
  const res = await fetch(url)
  const json = await res.json()

  // Transforma la respuesta de ESPN al formato que necesitamos
  return (json.events || []).map((event) => {
    const comp = event.competitions[0]
    const away = comp.competitors.find((t) => t.homeAway === 'away')
    const home = comp.competitors.find((t) => t.homeAway === 'home')
    const status = comp.status.type

    return {
      id: event.id,
      name: event.name,
      date: event.date,
      status: status.name,          // "STATUS_SCHEDULED" | "STATUS_IN_PROGRESS" | "STATUS_FINAL"
      isLocked: status.name !== 'STATUS_SCHEDULED',
      isFinal: status.name === 'STATUS_FINAL',
      isLive: status.name === 'STATUS_IN_PROGRESS',
      displayClock: comp.status.displayClock,
      period: comp.status.period,
      broadcast: comp.broadcasts?.[0]?.names?.[0] || '',
      // Lunes night = tiebreaker
      isMondayNight: new Date(event.date).getDay() === 1,
      away: {
        id: away.team.id,
        abbr: away.team.abbreviation,
        name: away.team.shortDisplayName,
        fullName: away.team.displayName,
        city: away.team.location,
        color: `#${away.team.color}`,
        altColor: `#${away.team.alternateColor}`,
        logo: away.team.logo,
        record: away.records?.[0]?.summary || '',
        score: parseInt(away.score) || 0,
        winner: away.winner || false,
      },
      home: {
        id: home.team.id,
        abbr: home.team.abbreviation,
        name: home.team.shortDisplayName,
        fullName: home.team.displayName,
        city: home.team.location,
        color: `#${home.team.color}`,
        altColor: `#${home.team.alternateColor}`,
        logo: home.team.logo,
        record: home.records?.[0]?.summary || '',
        score: parseInt(home.score) || 0,
        winner: home.winner || false,
      },
    }
  })
}

// ── Picks ─────────────────────────────────────────────────────────────────────

export const savePick = async ({ userId, groupId, gameId, week, season, pickedTeamId, tiebreakerTotal }) => {
  const { data, error } = await supabase
    .from('picks')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        game_id: gameId,
        week,
        season,
        picked_team_id: pickedTeamId,
        tiebreaker_total: tiebreakerTotal || null,
      },
      { onConflict: 'user_id,group_id,game_id' }
    )
    .select()
    .single()

  return { data, error }
}

export const getWeekPicks = (userId, groupId, week, season) =>
  supabase
    .from('picks')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('week', week)
    .eq('season', season)

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const getLeaderboard = (groupId, season) =>
  supabase
    .from('leaderboard_view')   // Vista calculada en Supabase (ver SQL)
    .select('*')
    .eq('group_id', groupId)
    .eq('season', season)
    .order('total_points', { ascending: false })
    .order('tiebreaker_diff', { ascending: true })  // Desempate: menor diferencia gana

// ── Admin: marcar como pagado ─────────────────────────────────────────────────

export const markAsPaid = (memberId, paid) =>
  supabase
    .from('group_members')
    .update({ paid })
    .eq('id', memberId)
