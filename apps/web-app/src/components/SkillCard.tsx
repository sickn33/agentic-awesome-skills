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
    <div className="h-full">
      <Link
        to={`/skill/${skill.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.85)] transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_56px_-34px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-slate-100/70 via-transparent to-teal-100/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-slate-800/60 dark:to-teal-900/20" />

        <div className="relative mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Icon name="book" size={20} className="h-5 w-5" />
            </div>
            <span className="truncate rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {skill.category || 'Uncategorized'}
            </span>
          </div>

          <SkillStarButton
            skillId={skill.id}
            communityCount={starCount}
            variant="default"
          />
        </div>

        <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          @{skill.name}
        </h3>

        <p className="mb-5 line-clamp-3 flex-grow text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {skill.description}
        </p>

        <div className="mb-4 flex items-center justify-between border-y border-slate-200/80 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            Risk:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{skill.risk || 'unknown'}</span>
          </span>
          {skill.date_added && (
            <span className="ml-2 truncate">Added {skill.date_added}</span>
          )}
        </div>

        <div className="mt-auto flex items-center text-sm font-medium text-slate-800 transition-transform group-hover:translate-x-1 dark:text-slate-200">
          Read skill
          <Icon name="arrowRight" size={16} className="ml-1 h-4 w-4" />
        </div>
      </Link>
    </div>
  );
});

SkillCard.displayName = 'SkillCard';
