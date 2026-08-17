import React from 'react';
import * as Badge from '@/components/ui/badge';
import { getRatingBadgeColor } from '@/utils/csi-utils';
import { CSI_RATING_SCALE } from '@/constants/csi-constants';

const CsiRatingScale = ({ rating, className = '', editable = false, onChange }) => {
  const hasValidRating = Number.isFinite(Number(rating)) && rating >= 1 && rating <= 10;
  const selectedRating = hasValidRating ? Math.round(Number(rating)) : null;

  const handleClick = (value) => {
    if (!editable || !onChange) return;
    onChange(value);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {CSI_RATING_SCALE.map((value) => {
        const color = getRatingBadgeColor(value, selectedRating || 0);
        const isSelected = selectedRating === value;

        const content = (
          <Badge.Root
            key={value}
            variant='light'
            color={color}
            square={!isSelected}
            className={isSelected ? 'size-7' : 'size-6 text-text-sub-500'}
          >
            {value}
          </Badge.Root>
        );

        if (!editable) {
          return content;
        }

        return (
          <button key={value} type='button' onClick={() => handleClick(value)}>
            {content}
          </button>
        );
      })}
    </div>
  );
};

export default CsiRatingScale;
