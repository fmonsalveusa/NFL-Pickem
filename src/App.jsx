import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import AuthPage        from './pages/AuthPage'
import PicksPage       from './pages/PicksPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GroupsPage      from './pages/GroupsPage'
import AdminPage       from './pages/AdminPage'
import SuperAdminPage  from './pages/SuperAdminPage'
import GroupPicksPage  from './pages/GroupPicksPage'
import { signOut, supabase } from './lib/supabase'

const Icons = {
  picks: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
    </svg>
  ),
  leaderboard: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M16 8v8M12 11v5M8 14v2M4 20h16"/>
    </svg>
  ),
  groups: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  admin: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  grouppicks: (active) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
    </svg>
  ),
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
}

export default function App() {
  const { user, loading } = useAuth()
  const [tab, setTab]           = useState('groups')
  const [activeGroup, setGroup] = useState(null)
  const [userRole, setUserRole] = useState('user')

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '?'
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        console.log('PERFIL ROLE:', data, error)
        if (data?.role) setUserRole(data.role)
      })
  }, [user])

  if (loading) {
    return (
      <div className="page-loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  const isSuperAdmin = userRole === 'super_admin'
  const isGroupAdmin = activeGroup?.admin_id === user?.id

  const tabs = [
    { id: 'picks',       label: 'Picks',   icon: Icons.picks },
    { id: 'grouppicks',  label: 'Ver todos', icon: Icons.grouppicks },
    { id: 'leaderboard', label: 'Tabla',   icon: Icons.leaderboard },
    { id: 'groups',      label: 'Grupos',  icon: Icons.groups },
    ...(isGroupAdmin ? [{ id: 'admin', label: 'Admin', icon: Icons.admin }] : []),
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'Master', icon: Icons.superadmin }] : []),
  ]

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-logo">NFL<span>.</span>Pick'Em</div>
          {activeGroup && tab !== 'groups' && tab !== 'superadmin' && (
            <div className="topbar-group">🏈 {activeGroup.name}</div>
          )}
          {isSuperAdmin && (
            <span style={{
              fontSize: 10, fontWeight: 700, background: '#D97706',
              color: '#fff', padding: '2px 7px', borderRadius: 20,
              letterSpacing: '0.05em', flexShrink: 0
            }}>MASTER</span>
          )}
          <div
            className="topbar-avatar"
            title={`${userName} — Cerrar sesión`}
            onClick={() => { if (confirm(`¿Cerrar sesión? (${user.email})`)) signOut() }}
          >
            {initials}
          </div>
        </div>
      </header>

      <main className="app-container">
        {tab === 'superadmin' ? (
          <SuperAdminPage />
        ) : tab === 'grouppicks' && activeGroup ? (
          <GroupPicksPage groupId={activeGroup.id} groupName={activeGroup.name} />
        ) : tab === 'groups' || !activeGroup ? (
          <GroupsPage onSelectGroup={(g) => { setGroup(g); setTab('picks') }} />
        ) : tab === 'picks' ? (
          <PicksPage groupId={activeGroup.id} groupName={activeGroup.name} />
        ) : tab === 'leaderboard' ? (
          <LeaderboardPage groupId={activeGroup.id} groupName={activeGroup.name} />
        ) : tab === 'admin' ? (
          <AdminPage group={activeGroup} />
        ) : null}
      </main>

      <nav className="bottom-nav">
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
            >
              {t.icon(active)}
              {t.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
