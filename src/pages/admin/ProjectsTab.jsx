import { useEffect, useState, useCallback } from 'react'
import SortableList from './SortableList.jsx'
import Editor from './Editor.jsx'
import { projectSchema, propertySchema, newProjectDefaults, newPropertyDefaults, PROJECT_STATUS, PROPERTY_STATUS } from './schema.js'
import {
  listProjects, createProject, updateProject, archiveProject, deleteProject, reorderRows,
  listProperties, createProperty, updateProperty, archiveProperty,
} from '../../lib/cms.js'
import { toast } from '../../lib/toast.js'

const statusLabel = (opts, v) => (opts.find((o) => o.value === v)?.label || v || '')

export default function ProjectsTab() {
  const [projects, setProjects] = useState([])
  const [selProjectId, setSelProjectId] = useState(null)
  const [properties, setProperties] = useState([])
  const [selPropId, setSelPropId] = useState(null)
  const [editingProp, setEditingProp] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const selProject = projects.find((p) => p.id === selProjectId) || null
  const selProp = properties.find((p) => p.id === selPropId) || null

  const q = query.trim().toLowerCase()
  const filtered = q ? projects.filter((p) => (p.name || '').toLowerCase().includes(q)) : projects

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try { setProjects(await listProjects()) } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const loadProperties = useCallback(async (projectId) => {
    try { setProperties(await listProperties(projectId)) } catch (e) { console.error(e) }
  }, [])

  const selectProject = async (id) => {
    setSelProjectId(id); setEditingProp(false); setSelPropId(null)
    await loadProperties(id)
  }

  const addProject = async () => {
    try {
      const row = await createProject(newProjectDefaults())
      await loadProjects()
      selectProject(row.id)
      toast.success('פרויקט חדש נוצר — אפשר להתחיל לערוך')
    } catch { toast.error('יצירת הפרויקט נכשלה') }
  }

  const saveProject = async (patch) => {
    // אם ה-slug רוקן/חסר — מייצרים אחד אוטומטית כדי שהקישור לעמוד הפרויקט תמיד יעבוד
    const next = { ...patch }
    if (Object.prototype.hasOwnProperty.call(next, 'slug') && !String(next.slug || '').trim()) {
      next.slug = 'project-' + Math.random().toString(36).slice(2, 8)
    }
    const updated = await updateProject(selProjectId, next)
    setProjects((prev) => prev.map((p) => (p.id === selProjectId ? { ...p, ...updated } : p)))
  }

  const onArchiveProject = async () => {
    if (!window.confirm('להעביר את הפרויקט לארכיון? הוא יוסר מהאתר הציבורי.')) return
    try {
      await archiveProject(selProjectId)
      setSelProjectId(null)
      loadProjects()
      toast.success('הפרויקט הועבר לארכיון')
    } catch { toast.error('ההעברה לארכיון נכשלה') }
  }

  // מחיקה עם "ביטול": מסירים מהרשימה מיד (optimistic), והמחיקה בפועל
  // מתבצעת רק אחרי 5 שניות — אם לא בוטלה. כך אין צורך בדיאלוג אישור מפחיד.
  const removeProject = (id) => {
    const p = projects.find((x) => x.id === id)
    setProjects((prev) => prev.filter((x) => x.id !== id))
    if (selProjectId === id) { setSelProjectId(null); setEditingProp(false); setSelPropId(null) }
    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      try { await deleteProject(id); toast.success(`"${p?.name || 'הפרויקט'}" נמחק`) }
      catch { toast.error('המחיקה נכשלה'); loadProjects() }
    }, 5000)
    toast(`"${p?.name || 'הפרויקט'}" יימחק`, {
      duration: 5000,
      action: { label: 'ביטול', onClick: () => { undone = true; clearTimeout(timer); loadProjects() } },
    })
  }

  const addProperty = async () => {
    try {
      const row = await createProperty(newPropertyDefaults(selProjectId))
      await loadProperties(selProjectId)
      setSelPropId(row.id); setEditingProp(true)
      toast.success('נכס חדש נוסף')
    } catch { toast.error('הוספת הנכס נכשלה') }
  }

  const saveProperty = async (patch) => {
    const updated = await updateProperty(selPropId, patch)
    setProperties((prev) => prev.map((p) => (p.id === selPropId ? { ...p, ...updated } : p)))
  }

  const onArchiveProperty = async () => {
    if (!window.confirm('להעביר את הנכס לארכיון?')) return
    try {
      await archiveProperty(selPropId)
      setEditingProp(false); setSelPropId(null)
      loadProperties(selProjectId)
      toast.success('הנכס הועבר לארכיון')
    } catch { toast.error('ההעברה לארכיון נכשלה') }
  }

  return (
    <div className="ptab">
      <aside className="ptab__side">
        <div className="ptab__side-head">
          <span>פרויקטים {projects.length > 0 && <em className="ptab__count">{projects.length}</em>}</span>
          <button type="button" className="btn btn--primary ptab__add" onClick={addProject}>+ פרויקט</button>
        </div>
        {projects.length > 4 && (
          <div className="ptab__search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש פרויקט…" aria-label="חיפוש פרויקט" />
            {query && <button type="button" className="ptab__search-clear" onClick={() => setQuery('')} aria-label="ניקוי">✕</button>}
          </div>
        )}
        {loading ? <p className="ptab__muted">טוען…</p> : (
          <SortableList
            items={filtered}
            getId={(p) => p.id}
            getLabel={(p) => p.name}
            getBadge={(p) => statusLabel(PROJECT_STATUS, p.status)}
            activeId={selProjectId}
            onSelect={selectProject}
            onDelete={removeProject}
            onReorder={(ids) => { if (q) return; setProjects((prev) => ids.map((id) => prev.find((p) => p.id === id))); reorderRows('projects', ids) }}
          />
        )}
        {!loading && projects.length === 0 && <p className="ptab__muted">אין פרויקטים. לחצי "+ פרויקט".</p>}
        {!loading && projects.length > 0 && filtered.length === 0 && <p className="ptab__muted">לא נמצאו פרויקטים התואמים "{query}".</p>}
      </aside>

      <main className="ptab__main">
        {!selProject && <p className="ptab__placeholder">בחרי פרויקט מהרשימה, או הוסיפי חדש.</p>}

        {selProject && !editingProp && (
          <>
            <Editor
              key={selProject.id}
              schema={projectSchema}
              record={selProject}
              onSave={saveProject}
              folder={`projects/${selProject.slug || selProject.id}`}
              coverField="hero_image_url"
              onArchive={onArchiveProject}
              onClose={() => setSelProjectId(null)}
              previewUrl={`/projects/${selProject.slug || selProject.id}`}
              title={`עריכת פרויקט: ${selProject.name}`}
            />

            <section className="ptab__props">
              <div className="ptab__props-head">
                <h3>נכסים בפרויקט ({properties.length})</h3>
                <button type="button" className="btn btn--primary" onClick={addProperty}>+ נכס</button>
              </div>
              {properties.length === 0 ? (
                <p className="ptab__muted">אין נכסים. לחצי "+ נכס" כדי להוסיף יחידה.</p>
              ) : (
                <SortableList
                  items={properties}
                  getId={(p) => p.id}
                  getLabel={(p) => `יחידה ${p.unit_number || '—'} · ${p.rooms || '?'} חד׳`}
                  getBadge={(p) => statusLabel(PROPERTY_STATUS, p.status)}
                  activeId={selPropId}
                  onSelect={(id) => { setSelPropId(id); setEditingProp(true) }}
                  onReorder={(ids) => { setProperties((prev) => ids.map((id) => prev.find((p) => p.id === id))); reorderRows('properties', ids) }}
                />
              )}
            </section>
          </>
        )}

        {selProject && editingProp && selProp && (
          <>
            <button type="button" className="ptab__back" onClick={() => { setEditingProp(false); setSelPropId(null) }}>← חזרה לפרויקט</button>
            <Editor
              key={selProp.id}
              schema={propertySchema}
              record={selProp}
              onSave={saveProperty}
              folder={`properties/${selProp.id}`}
              onArchive={onArchiveProperty}
              onClose={() => { setEditingProp(false); setSelPropId(null) }}
              title={`עריכת נכס · ${selProject.name}`}
            />
          </>
        )}
      </main>
    </div>
  )
}
