import { useEffect, useState, useCallback } from 'react'
import SortableList from './SortableList.jsx'
import Editor from './Editor.jsx'
import { projectSchema, propertySchema, newProjectDefaults, newPropertyDefaults, PROJECT_STATUS, PROPERTY_STATUS } from './schema.js'
import {
  listProjects, createProject, updateProject, archiveProject, reorderRows,
  listProperties, createProperty, updateProperty, archiveProperty,
} from '../../lib/cms.js'

const statusLabel = (opts, v) => (opts.find((o) => o.value === v)?.label || v || '')

export default function ProjectsTab() {
  const [projects, setProjects] = useState([])
  const [selProjectId, setSelProjectId] = useState(null)
  const [properties, setProperties] = useState([])
  const [selPropId, setSelPropId] = useState(null)
  const [editingProp, setEditingProp] = useState(false)
  const [loading, setLoading] = useState(true)

  const selProject = projects.find((p) => p.id === selProjectId) || null
  const selProp = properties.find((p) => p.id === selPropId) || null

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
    const row = await createProject(newProjectDefaults())
    await loadProjects()
    selectProject(row.id)
  }

  const saveProject = async (patch) => {
    const updated = await updateProject(selProjectId, patch)
    setProjects((prev) => prev.map((p) => (p.id === selProjectId ? { ...p, ...updated } : p)))
  }

  const onArchiveProject = async () => {
    if (!window.confirm('להעביר את הפרויקט לארכיון? הוא יוסר מהאתר הציבורי.')) return
    await archiveProject(selProjectId)
    setSelProjectId(null)
    loadProjects()
  }

  const addProperty = async () => {
    const row = await createProperty(newPropertyDefaults(selProjectId))
    await loadProperties(selProjectId)
    setSelPropId(row.id); setEditingProp(true)
  }

  const saveProperty = async (patch) => {
    const updated = await updateProperty(selPropId, patch)
    setProperties((prev) => prev.map((p) => (p.id === selPropId ? { ...p, ...updated } : p)))
  }

  const onArchiveProperty = async () => {
    if (!window.confirm('להעביר את הנכס לארכיון?')) return
    await archiveProperty(selPropId)
    setEditingProp(false); setSelPropId(null)
    loadProperties(selProjectId)
  }

  return (
    <div className="ptab">
      <aside className="ptab__side">
        <div className="ptab__side-head">
          <span>פרויקטים</span>
          <button type="button" className="btn btn--primary ptab__add" onClick={addProject}>+ פרויקט</button>
        </div>
        {loading ? <p className="ptab__muted">טוען…</p> : (
          <SortableList
            items={projects}
            getId={(p) => p.id}
            getLabel={(p) => p.name}
            getBadge={(p) => statusLabel(PROJECT_STATUS, p.status)}
            activeId={selProjectId}
            onSelect={selectProject}
            onReorder={(ids) => { setProjects((prev) => ids.map((id) => prev.find((p) => p.id === id))); reorderRows('projects', ids) }}
          />
        )}
        {!loading && projects.length === 0 && <p className="ptab__muted">אין פרויקטים. לחצי "+ פרויקט".</p>}
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
              title={`עריכת נכס · ${selProject.name}`}
            />
          </>
        )}
      </main>
    </div>
  )
}
