import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import {
  RiCheckboxBlankCircleLine,
  RiFolderLine,
  RiLayoutGridLine,
  RiListCheck3,
} from 'react-icons/ri';
import {
  BOARD_ENTITY_TAG_CLASS,
  ENTITY_TYPES,
  escapeHtml,
  getEntityTagIconSvg,
} from './board-comment-utils';
import './board-entity-tag.css';

export function getEntityTagIcon(entityType) {
  if (entityType === ENTITY_TYPES.FOLDER) return RiFolderLine;
  if (entityType === ENTITY_TYPES.LIST) return RiListCheck3;
  if (entityType === ENTITY_TYPES.TASK) return RiCheckboxBlankCircleLine;
  return RiLayoutGridLine;
}

function BoardEntityTagNodeView({ node }) {
  const label = node.attrs.label || 'Untitled';
  const Icon = getEntityTagIcon(node.attrs.entityType);

  return (
    <NodeViewWrapper
      as='span'
      className={BOARD_ENTITY_TAG_CLASS}
      contentEditable={false}
      data-drag-handle
    >
      <Icon className='board-entity-tag__icon' size={12} aria-hidden />
      <span className='board-entity-tag__label'>{label}</span>
    </NodeViewWrapper>
  );
}

export const BoardEntityTag = Node.create({
  name: 'boardEntityTag',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      entityType: {
        default: ENTITY_TYPES.TASK,
        parseHTML: (element) => element.getAttribute('data-entity-type'),
        renderHTML: (attributes) => ({
          'data-entity-type': attributes.entityType,
        }),
      },
      entityId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entity-id'),
        renderHTML: (attributes) => ({
          'data-entity-id': attributes.entityId,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-label') || element.textContent?.trim() || '',
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
      href: {
        default: '/boards',
        parseHTML: (element) => element.getAttribute('href') || '/boards',
        renderHTML: (attributes) => ({
          href: attributes.href,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `a.${BOARD_ENTITY_TAG_CLASS}`,
      },
      {
        tag: `a[data-entity-type][data-entity-id]`,
      },
      {
        tag: `span.${BOARD_ENTITY_TAG_CLASS}`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.label || 'Untitled';
    const entityType = node.attrs.entityType || ENTITY_TYPES.TASK;
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: BOARD_ENTITY_TAG_CLASS,
        'data-entity-type': entityType,
        'data-entity-id': node.attrs.entityId,
        'data-label': label,
        href: node.attrs.href || '/boards',
        rel: 'noopener noreferrer',
      }),
      ['span', { class: 'board-entity-tag__label' }, label],
    ];
  },

  renderText({ node }) {
    return node.attrs.label || '';
  },

  addNodeView() {
    return ReactNodeViewRenderer(BoardEntityTagNodeView);
  },

  addCommands() {
    return {
      insertBoardEntityTag:
        (attrs) =>
        ({ commands }) => {
          if (!attrs?.entityId || !attrs?.entityType) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              entityType: attrs.entityType,
              entityId: attrs.entityId,
              label: attrs.label || 'Untitled',
              href: attrs.href || '/boards',
            },
          });
        },
    };
  },
});

export function boardEntityTagToHtml(attrs) {
  const label = escapeHtml(attrs?.label || 'Untitled');
  const entityType = escapeHtml(attrs?.entityType || ENTITY_TYPES.TASK);
  const entityId = escapeHtml(attrs?.entityId || '');
  const href = escapeHtml(attrs?.href || '/boards');
  const icon = getEntityTagIconSvg(attrs?.entityType || ENTITY_TYPES.TASK);

  return `<a class="${BOARD_ENTITY_TAG_CLASS}" data-entity-type="${entityType}" data-entity-id="${entityId}" data-label="${label}" href="${href}" rel="noopener noreferrer">${icon}<span class="board-entity-tag__label">${label}</span></a>`;
}

export default BoardEntityTag;
