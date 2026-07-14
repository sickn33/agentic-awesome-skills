import React from 'react';
import { Link } from 'react-router-dom';
import { SkillStarButton } from './SkillStarButton';
import { Icon } from './ui/Icon';
import type { Skill } from '../types';

interface SkillCardProps {
  skill: Skill;
  starCount: number;
}

export const SkillCard = React.memo(({ skill, starCount }: SkillCardProps) => {
  return (
    <article className="skill-row group">
      <Link
        to={`/skill/${skill.id}`}
        className="skill-row__link"
        aria-label={`Read skill ${skill.name}`}
      >
        <div className="skill-row__mark" aria-hidden="true">
          <Icon name="book" size={22} />
        </div>
        <div className="skill-row__content">
          <div className="skill-row__titleline">
            <h3>@{skill.name}</h3>
            <span>{skill.category || 'Uncategorized'}</span>
          </div>
          <p>{skill.description}</p>
          <div className="skill-row__meta">
            <span>Risk: <strong>{skill.risk || 'unknown'}</strong></span>
            {skill.date_added && <span>Added {skill.date_added}</span>}
          </div>
        </div>
        <span className="skill-row__open">
          Open skill
          <Icon name="arrowRight" size={16} className="ml-1 h-4 w-4" />
        </span>
      </Link>
      <div className="skill-row__save">
        <SkillStarButton
          skillId={skill.id}
          communityCount={starCount}
          variant="default"
        />
      </div>
    </article>
  );
});

SkillCard.displayName = 'SkillCard';
