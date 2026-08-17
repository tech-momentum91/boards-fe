import React from 'react';

export const SectionTitle = ({ icon: Icon, children, className = '', iconClassName = '' }) => (
  <h2 className={`mb-3 flex items-center gap-2 text-label-sm font-semibold uppercase ${className}`}>
    <Icon size={20} className={iconClassName} />
    <span>{children}</span>
  </h2>
);
