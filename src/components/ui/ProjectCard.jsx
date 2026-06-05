import { Link } from 'react-router-dom'
import { useI18n, useLocalized } from '../../i18n/index.jsx'
import SmartImage from './SmartImage.jsx'
import Icon from './Icon.jsx'
import './ProjectCard.css'

export default function ProjectCard({ project }) {
  const { t } = useI18n()
  const L = useLocalized()

  return (
    <Link to={`/projects/${project.slug}`} className="project-card">
      <div className="project-card__media">
        <SmartImage
          src={project.cover}
          alt={L(project.name)}
          label={L(project.name)}
          className="project-card__img"
        />
        <span className={`project-card__status project-card__status--${project.status}`}>
          {t(`projects.status.${project.status}`)}
        </span>
        {project.category && (
          <span className={`project-card__cat project-card__cat--${project.category}`}>
            {t(`category.${project.category}`)}
          </span>
        )}
        <span className="project-card__overlay">
          <span className="project-card__view">
            {t('projects.viewProject')}
            <Icon name="arrow" size={18} className="project-card__arrow" />
          </span>
        </span>
      </div>
      <div className="project-card__caption">
        <h3 className="project-card__title">{L(project.name)}</h3>
        <span className="project-card__city">
          <Icon name="location" size={14} /> {L(project.city)} · {project.year}
        </span>
      </div>
    </Link>
  )
}
