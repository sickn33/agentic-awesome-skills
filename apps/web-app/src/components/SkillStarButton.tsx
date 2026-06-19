import React from 'react';
import { useSkillStars } from '../hooks/useSkillStars';
import { Icon } from './ui/Icon';

interface SkillStarButtonProps {
  skillId: string;
  communityCount?: number;
  onSaveClick?: () => void;
  variant?: 'default' | 'compact';
}

/**
 * Local-save button for skills with an optional read-only community count.
 */
export function SkillStarButton({
  skillId,
  communityCount = 0,
  onSaveClick,
  variant = 'default'
}: SkillStarButtonProps): React.ReactElement {
  const { hasSaved, handleSaveClick, isSaving } = useSkillStars(skillId);
  const actionLabel = hasSaved ? 'Saved locally' : 'Save locally';
  const communityLabel = communityCount > 0
    ? `${communityCount.toLocaleString('en-US')} community saves`
    : null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasSaved || isSaving) return;

    await handleSaveClick();
    onSaveClick?.();
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {communityLabel && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {communityLabel}
          </span>
        )}
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/35"
          disabled={hasSaved || isSaving}
          title={hasSaved ? 'Saved in this browser' : 'Save this skill in this browser'}
        >
          <Icon
            name="star"
            size={14}
            weight={hasSaved ? 'fill' : 'regular'}
            className={`h-3.5 w-3.5 ${hasSaved ? 'text-amber-500' : ''}`}
          />
          <span>{actionLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="z-10 flex flex-col items-end gap-2">
      {communityLabel && (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {communityLabel}
        </span>
      )}
      <button
        onClick={handleClick}
        className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-amber-700/60 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
        disabled={hasSaved || isSaving}
        title={hasSaved ? 'Saved in this browser' : 'Save this skill in this browser'}
      >
        <Icon
          name="star"
          size={16}
          weight={hasSaved ? 'fill' : 'regular'}
          className={`h-4 w-4 ${hasSaved ? 'text-amber-400' : ''} ${isSaving ? 'animate-pulse' : ''}`}
        />
        <span className="text-xs font-semibold">{actionLabel}</span>
      </button>
    </div>
  );
}

export default SkillStarButton;
