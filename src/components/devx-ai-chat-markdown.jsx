import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

const mdBase = 'paragraph-small text-text-sub-500 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0';

const heading2 =
  'label-medium mt-4 mb-2 text-text-main-900 first:mt-0 border-b border-stroke-soft-200 pb-1.5';
const heading3 = 'label-small mt-3 mb-1.5 text-text-main-900 first:mt-0';

const listUnordered = 'my-2 list-none space-y-1.5 pl-0';
const listOrdered = 'my-2 list-decimal space-y-1.5 pl-5 marker:text-text-soft-400';

const listItem = cn(
  'relative pl-4 text-[14px] leading-5 tracking-[-0.084px] text-text-sub-500',
  "before:absolute before:left-0 before:top-[0.45em] before:size-1.5 before:rounded-full before:bg-purple-400/80 before:content-['']",
);

const listItemOrdered = 'text-[14px] leading-5 tracking-[-0.084px] text-text-sub-500 pl-0.5';

const paragraph =
  'mb-2.5 mt-0 last:mb-0 text-[14px] leading-5 tracking-[-0.084px] text-text-sub-500';

const strong = 'font-semibold text-text-main-900';

const blockquote = cn(
  'my-3 border-l-[3px] border-purple-400/70 bg-purple-50/60 py-2 pl-3 pr-2 rounded-r-lg',
  'text-[13px] leading-5 text-text-sub-600 italic',
);

const hr = 'my-4 border-0 border-t border-stroke-soft-200';

const codeInline =
  'rounded-md bg-bg-weak-100 px-1.5 py-0.5 font-mono text-[12px] text-text-main-900';

const preBlock = cn(
  'my-3 overflow-x-auto rounded-lg border border-stroke-soft-200 bg-bg-weak-50 p-3',
  'text-[12px] leading-relaxed text-text-main-900',
);

const tableWrap = 'my-3 overflow-x-auto rounded-lg border border-stroke-soft-200';

const table = 'w-full border-collapse text-left text-[13px] leading-5 text-text-sub-600';

const th =
  'border-b border-stroke-soft-200 bg-bg-weak-50 px-2.5 py-2 font-medium text-text-main-900';

const td = 'border-b border-stroke-soft-100 px-2.5 py-2 align-top';

const link =
  'font-medium text-purple-700 underline decoration-purple-300/60 underline-offset-2 hover:text-purple-900';

const components = {
  h1: ({ className, ...props }) => (
    <h1 className={cn(heading2, 'text-base', className)} {...props} />
  ),
  h2: ({ className, ...props }) => <h2 className={cn(heading2, className)} {...props} />,
  h3: ({ className, ...props }) => <h3 className={cn(heading3, className)} {...props} />,
  h4: ({ className, ...props }) => (
    <h4 className={cn(heading3, 'text-text-sub-600', className)} {...props} />
  ),
  p: ({ className, ...props }) => <p className={cn(paragraph, className)} {...props} />,
  strong: ({ className, ...props }) => <strong className={cn(strong, className)} {...props} />,
  em: ({ className, ...props }) => (
    <em className={cn('italic text-text-sub-600', className)} {...props} />
  ),
  ul: ({ className, ...props }) => <ul className={cn(listUnordered, className)} {...props} />,
  ol: ({ className, ...props }) => <ol className={cn(listOrdered, className)} {...props} />,
  li: ({ className, node, ...props }) => {
    const ordered = node?.parent?.tagName === 'ol';
    return <li className={cn(ordered ? listItemOrdered : listItem, className)} {...props} />;
  },
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn(blockquote, className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn(hr, className)} {...props} />,
  a: ({ className, ...props }) => (
    <a className={cn(link, className)} target='_blank' rel='noopener noreferrer' {...props} />
  ),
  code: ({ className, inline, ...props }) =>
    inline ? (
      <code className={cn(codeInline, className)} {...props} />
    ) : (
      <code className={cn('font-mono text-[12px]', className)} {...props} />
    ),
  pre: ({ className, ...props }) => <pre className={cn(preBlock, className)} {...props} />,
  table: ({ className, ...props }) => (
    <div className={tableWrap}>
      <table className={cn(table, className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => <thead className={className} {...props} />,
  tbody: ({ className, ...props }) => <tbody className={className} {...props} />,
  tr: ({ className, ...props }) => <tr className={className} {...props} />,
  th: ({ className, ...props }) => <th className={cn(th, className)} {...props} />,
  td: ({ className, ...props }) => <td className={cn(td, className)} {...props} />,
};

/**
 * Renders assistant markdown using design tokens (Figtree via paragraph-small).
 */
export function DevxAiChatMarkdown({ markdown, className }) {
  const src = typeof markdown === 'string' ? markdown : '';
  if (!src.trim()) {
    return null;
  }

  return (
    <div className={cn(mdBase, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {src}
      </ReactMarkdown>
    </div>
  );
}
