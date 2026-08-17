import React, { useState, useCallback, useRef } from 'react';
import { CiLink } from 'react-icons/ci';
import {
  RiLinkedinBoxLine,
  RiInstagramLine,
  RiFacebookBoxLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
} from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';

const SOCIAL_ROWS = [
  { key: 'linkedin', icon: RiLinkedinBoxLine, placeholder: 'No LinkedIn URL', label: 'LinkedIn' },
  { key: 'instagram', icon: RiInstagramLine, placeholder: 'No Instagram URL', label: 'Instagram' },
  { key: 'facebook', icon: RiFacebookBoxLine, placeholder: 'No Facebook URL', label: 'Facebook' },
];

const SocialRow = ({ icon: Icon, value, placeholder, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  const handleEdit = () => {
    setDraft(value || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = useCallback(() => {
    setEditing(false);
    if (draft.trim() !== (value || '')) {
      onSave?.(draft.trim());
    }
  }, [draft, value, onSave]);

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  const href = value ? (value.startsWith('http') ? value : `https://${value}`) : null;

  return (
    <div className='group flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-100 px-3 py-2.5'>
      <Icon size={18} className='text-text-soft-400 shrink-0' />

      {editing ? (
        <>
          <input
            ref={inputRef}
            type='url'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${placeholder.replace('No ', '').replace(' URL', '')} URL`}
            className='flex-1 bg-transparent text-paragraph-sm text-text-main-900 placeholder:text-text-soft-400 outline-none min-w-0 font-medium'
          />
          <div className='flex items-center gap-1 shrink-0'>
            <CompactButton.Root size='small' variant='stroke' onClick={handleConfirm}>
              <CompactButton.Icon as={RiCheckLine} />
            </CompactButton.Root>
            <CompactButton.Root size='small' variant='stroke' onClick={handleCancel}>
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </div>
        </>
      ) : (
        <>
          {href ? (
            <a
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 text-paragraph-sm text-text-sub-500 hover:text-primary-base transition-colors truncate min-w-0 font-medium'
            >
              {value}
            </a>
          ) : (
            <span className='flex-1 text-paragraph-sm text-text-soft-400 italic min-w-0'>
              {placeholder}
            </span>
          )}
          <div className='shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <CompactButton.Root size='small' variant='stroke' onClick={handleEdit}>
              <CompactButton.Icon as={RiPencilLine} />
            </CompactButton.Root>
          </div>
        </>
      )}
    </div>
  );
};

const CrmContactAboutSocialLinks = ({ contact = {}, onFieldChange }) => {
  return (
    <div className='flex flex-col gap-3 border-t border-stroke-soft-200 py-6 mb-10'>
      <div className='flex items-center gap-2 mb-2'>
        <CiLink size={20} className='text-text-soft-400' />
        <span className='text-label-md text-text-sub-500 font-medium'>Social Links</span>
      </div>
      <div className='flex flex-col gap-2.5'>
        {SOCIAL_ROWS.map(({ key, icon, placeholder }) => (
          <SocialRow
            key={key}
            icon={icon}
            value={contact?.[key]}
            placeholder={placeholder}
            onSave={(value) => onFieldChange?.(key, value)}
          />
        ))}
      </div>
    </div>
  );
};

export default CrmContactAboutSocialLinks;
