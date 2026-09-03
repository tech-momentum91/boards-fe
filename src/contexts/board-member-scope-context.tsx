import { createContext, useContext, type ReactNode } from 'react';

export type BoardMemberScopeValue = {
  /** Prefer list when available — members resolve via list → board inheritance. */
  listId?: string | null;
  spaceId?: string | null;
  folderId?: string | null;
  resourceType?: 'list' | 'folder' | 'space' | null;
  resourceId?: string | null;
};

const BoardMemberScopeContext = createContext<BoardMemberScopeValue>({});

export function BoardMemberScopeProvider({
  listId = null,
  spaceId = null,
  folderId = null,
  resourceType = null,
  resourceId = null,
  children,
}: BoardMemberScopeValue & { children: ReactNode }) {
  const value: BoardMemberScopeValue = {
    listId: listId || null,
    spaceId: spaceId || null,
    folderId: folderId || null,
    resourceType: resourceType || null,
    resourceId: resourceId || null,
  };
  return (
    <BoardMemberScopeContext.Provider value={value}>{children}</BoardMemberScopeContext.Provider>
  );
}

export function useBoardMemberScope(): BoardMemberScopeValue {
  return useContext(BoardMemberScopeContext);
}

/** Payload fields for search_users / get_users_for_tagging. */
export function boardMemberScopeToApiParams(
  scope: BoardMemberScopeValue | null | undefined,
  overrides: BoardMemberScopeValue = {},
) {
  // Only apply defined non-empty overrides so null props don't wipe context.
  const merged: BoardMemberScopeValue = { ...(scope || {}) };
  (Object.keys(overrides) as (keyof BoardMemberScopeValue)[]).forEach((key) => {
    const value = overrides[key];
    if (value != null && value !== '') {
      merged[key] = value as never;
    }
  });

  const params: Record<string, string> = {};
  if (merged.resourceType && merged.resourceId) {
    params.resource_type = merged.resourceType;
    params.resource_id = merged.resourceId;
    return params;
  }
  if (merged.listId) {
    params.list_id = String(merged.listId);
    return params;
  }
  if (merged.folderId) {
    params.folder_id = String(merged.folderId);
    return params;
  }
  if (merged.spaceId) {
    params.space_id = String(merged.spaceId);
  }
  return params;
}
