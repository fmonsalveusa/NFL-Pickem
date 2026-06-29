import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function SuperAdminPage() {
  const { user } = useAuth()
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)   // grupo expandido
  const [editGroup, setEditGroup] = useState(null) // grupo en edición
  const [editName, setEditName]   = useState('')
  const [editFee, setEditFee]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)

    // Carga todos los grupos con sus miembros y admin
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id, name, season, entry_fee, invite_code, created_at, admin_id,
        profiles!groups_admin_id_fkey (full_name, email),
        group_members (
          id, paid, user_id,
          profiles (full_name, email, role)
        )
      `)
      .order('created_at', { ascending: false })

    if (!error) setGroups(data || [])
    setLoading(false)
  }

  const handleDelete = async (groupId, groupName) => {
    if (!confirm(`¿Seguro que quieres eliminar el grupo "${groupName}"? Esta acción no se puede deshacer.`)) return

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (!error) {
      showToast(`Grupo "${groupName}" eliminado`)
      loadAll()
    } else {
      showToast('Error al eliminar el grupo')
    }
  }

  const handleEdit = (group) => {
    setEditGroup(group)
    setEditName(group.name)
    setEditFee(group.entry_fee || '')
  }

  const handleSaveEdit = async () => {
    if (!editGroup) return
    setSaving(true)

    const { error } = await supabase
      .from('groups')
      .update({ name: editName, entry_fee: parseFloat(editFee) || 0 })
      .eq('id', editGroup.id)

    if (!error) {
      showToast('Grupo actualizado')
      setEditGroup(null)
      loadAll()
    } else {
      showToast('Error al actualizar')
    }
    setSaving(false)
  }

  const handleRemoveMember = async (memberId, userName, groupName) => {
    if (!confirm(`¿Remover a ${userName} del grupo "${groupName}"?`)) return

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId)

    if (!error) {
      showToast(`${userName} removido del grupo`)
      loadAll()
    }
  }

  const handleTogglePaid = async (memberId, currentPaid) => {
    await supabase
      .from('group_members')
      .update({ paid: !currentPaid })
      .eq('id', memberId)
    loadAll()
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    showToast(`Código ${code} copiado`)
  }

  const totalMembers = groups.reduce((s, g) => s + (g.group_members?.length || 0), 0)
  const totalPaid    = groups.reduce((s, g) => s + (g.group_members?.filter(m => m.paid).length || 0), 0)

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 0 12px' }}>
        <h2 className="section-title">🛡️ Super Admin</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: -8 }}>
          Vista completa de todos los grupos y participantes
        </p>
      </div>

      {/* Stats generales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Grupos',       value: groups.length,  color: 'var(--nfl-blue)' },
          { label: 'Participantes', value: totalMembers,   color: '#15803D' },
          { label: 'Pagaron',       value: totalPaid,      color: '#D97706' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de grupos */}
      {groups.length === 0 ? (
        <div className="page-loading" style={{ color: 'var(--text-3)' }}>
          No hay grupos creados todavía
        </div>
      ) : (
        groups.map(group => (
          <div key={group.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, marginBottom: 10, overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Cabecera del grupo */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              background: expanded === group.id ? '#EFF6FF' : 'var(--surface)',
              cursor: 'pointer',
            }} onClick={() => setExpanded(expanded === group.id ? null : group.id)}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--nfl-blue)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>🏈</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                  {group.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  Admin: {group.profiles?.full_name || group.profiles?.email} ·
                  {group.group_members?.length || 0} miembros ·
                  Temporada {group.season}
                </div>
              </div>

              {/* Código */}
              <div
                style={{
                  fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                  color: 'var(--nfl-blue)', background: '#EFF6FF',
                  border: '1px solid #BFDBFE', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer', flexShrink: 0
                }}
                onClick={(e) => { e.stopPropagation(); copyCode(group.invite_code) }}
                title="Copiar código"
              >
                {group.invite_code}
              </div>

              <span style={{ fontSize: 18, color: 'var(--text-3)', marginLeft: 4 }}>
                {expanded === group.id ? '▲' : '▼'}
              </span>
            </div>

            {/* Detalle expandido */}
            {expanded === group.id && (
              <div style={{ borderTop: '1px solid var(--border)' }}>

                {/* Info del grupo */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12, padding: '12px 16px',
                  background: 'var(--surface-2)', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Entry fee</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${group.entry_fee || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Código invitación</div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>
                      {group.invite_code}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Creado</div>
                    <div style={{ fontSize: 13 }}>
                      {new Date(group.created_at).toLocaleDateString('es-US')}
                    </div>
                  </div>
                </div>

                {/* Miembros */}
                <div style={{ padding: '10px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                    PARTICIPANTES ({group.group_members?.length || 0})
                  </div>
                  {group.group_members?.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin miembros todavía</p>
                  ) : (
                    group.group_members?.map(member => (
                      <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 0', borderBottom: '1px solid var(--border)'
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#DBEAFE', color: 'var(--nfl-blue)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, flexShrink: 0
                        }}>
                          {(member.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                            {member.profiles?.full_name || 'Sin nombre'}
                            {member.user_id === group.admin_id && (
                              <span style={{ fontSize: 10, color: 'var(--nfl-blue)', marginLeft: 5 }}>Admin</span>
                            )}
                            {member.profiles?.role === 'super_admin' && (
                              <span style={{ fontSize: 10, color: '#D97706', marginLeft: 5 }}>Super Admin</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {member.profiles?.email}
                          </div>
                        </div>

                        {/* Toggle pagado */}
                        <button
                          className={`paid-badge ${member.paid ? 'yes' : 'no'}`}
                          style={{ border: 'none', cursor: 'pointer', fontSize: 11 }}
                          onClick={() => handleTogglePaid(member.id, member.paid)}
                        >
                          {member.paid ? '✓ Pagado' : 'Pendiente'}
                        </button>

                        {/* Remover miembro */}
                        {member.user_id !== group.admin_id && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.profiles?.full_name, group.name)}
                            style={{
                              background: 'none', border: 'none',
                              color: 'var(--red)', fontSize: 16, cursor: 'pointer',
                              padding: '0 4px'
                            }}
                            title="Remover del grupo"
                          >✕</button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Acciones del grupo */}
                <div style={{
                  display: 'flex', gap: 8, padding: '10px 16px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(group)}
                  >
                    ✏️ Editar grupo
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'none', border: '1px solid var(--border-dark)', color: 'var(--text-2)' }}
                    onClick={() => copyCode(group.invite_code)}
                  >
                    🔗 Copiar código
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => handleDelete(group.id, group.name)}
                  >
                    🗑️ Eliminar grupo
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Modal editar grupo */}
      {editGroup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          z: 200, padding: 16
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 12,
            padding: 24, width: '100%', maxWidth: 400,
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
              Editar grupo
            </h3>
            <div className="form-group">
              <label className="form-label">Nombre del grupo</label>
              <input
                className="form-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Entry fee (USD)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={editFee}
                onChange={e => setEditFee(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setEditGroup(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
