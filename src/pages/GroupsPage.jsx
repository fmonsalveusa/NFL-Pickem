import { useState, useEffect } from 'react'
import { createGroup, joinGroup, getUserGroups } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function GroupsPage({ onSelectGroup }) {
  const { user } = useAuth()
  const [groups, setGroups]   = useState([])
  const [mode, setMode]       = useState('list')   // 'list' | 'create' | 'join'
  const [loading, setLoading] = useState(true)

  // Form crear
  const [groupName, setGroupName]   = useState('')
  const [entryFee, setEntryFee]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newCode, setNewCode]       = useState('')
  const [copied, setCopied]         = useState(false)

  // Form unirse
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError]   = useState('')

  useEffect(() => {
    loadGroups()
  }, [user])

  const loadGroups = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await getUserGroups(user.id)
    setGroups(data || [])
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setSubmitting(true)

    const { data, error } = await createGroup({
      name: groupName,
      entryFee: parseFloat(entryFee) || 0,
      season: 2026,
      adminId: user.id,
    })

    if (!error && data) {
      setNewCode(data.invite_code)
      await loadGroups()
    }
    setSubmitting(false)
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setJoinError('')
    setSubmitting(true)

    const { error } = await joinGroup(inviteCode.trim(), user.id)
    if (error) {
      setJoinError(error.message)
    } else {
      await loadGroups()
      setMode('list')
    }
    setSubmitting(false)
  }

  const copyInvite = (code) => {
    navigator.clipboard.writeText(
      `${import.meta.env.VITE_APP_URL}/join/${code}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div>
      <div style={{ padding: '16px 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 className="section-title" style={{ margin: 0, flex: 1 }}>Mis grupos</h2>
        {mode === 'list' && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setMode('join')}>
              Unirme
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setMode('create')}>
              + Crear
            </button>
          </>
        )}
        {mode !== 'list' && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setMode('list'); setNewCode('') }}>
            ← Volver
          </button>
        )}
      </div>

      {/* Lista de grupos */}
      {mode === 'list' && (
        <>
          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏈</div>
              <p>No estás en ningún grupo todavía.</p>
              <p style={{ marginTop: 4 }}>Crea uno o únete con un código de invitación.</p>
            </div>
          ) : (
            groups.map(({ groups: g, paid }) => (
              <div
                key={g.id}
                className="group-card"
                onClick={() => onSelectGroup(g)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--nfl-blue)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0
                  }}>🏈</div>
                  <div style={{ flex: 1 }}>
                    <div className="group-card-name">{g.name}</div>
                    <div className="group-card-meta">
                      Temporada {g.season} · Entry fee: ${g.entry_fee || '0'}
                      {g.admin_id === user?.id && ' · Admin'}
                    </div>
                  </div>
                  <span className={`paid-badge ${paid ? 'yes' : 'no'}`}>
                    {paid ? 'Pagado ✓' : 'Pendiente'}
                  </span>
                </div>

                {g.admin_id === user?.id && (
                  <div className="invite-code-box" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
                        Código de invitación
                      </div>
                      <div className="invite-code">{g.invite_code}</div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyInvite(g.invite_code)}
                    >
                      {copied ? '✓ Copiado' : 'Copiar link'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* Crear grupo */}
      {mode === 'create' && (
        <div className="auth-card" style={{ maxWidth: '100%', boxShadow: 'none', padding: '0' }}>
          {!newCode ? (
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Nombre del grupo</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ej: Los Carnales 2026"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entry fee (USD)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 50"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                />
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  El pago entre participantes se coordina fuera de la app (Zelle, Venmo, etc.)
                </p>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Crear grupo'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h3 style={{ marginBottom: 8 }}>¡Grupo creado!</h3>
              <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
                Comparte este código con tus participantes:
              </p>
              <div className="invite-code-box" style={{ justifyContent: 'center', marginBottom: 16 }}>
                <span className="invite-code" style={{ fontSize: 28 }}>{newCode}</span>
              </div>
              <button
                className="btn btn-primary btn-full btn-pill"
                onClick={() => copyInvite(newCode)}
              >
                {copied ? '✓ Link copiado' : '🔗 Copiar link de invitación'}
              </button>
              <button
                className="btn btn-secondary btn-full"
                style={{ marginTop: 8 }}
                onClick={() => { setMode('list'); setNewCode('') }}
              >
                Ir a mis grupos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unirse a grupo */}
      {mode === 'join' && (
        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label">Código de invitación</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ej: AB3X7K2M"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              style={{ letterSpacing: '3px', fontWeight: 700, fontSize: 18 }}
            />
            {joinError && <p className="form-error">{joinError}</p>}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || inviteCode.length < 6}
          >
            {submitting ? 'Buscando...' : 'Unirme al grupo'}
          </button>
        </form>
      )}
    </div>
  )
}
