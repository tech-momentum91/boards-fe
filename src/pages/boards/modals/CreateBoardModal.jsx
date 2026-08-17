import { useEffect, useState } from 'react';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Modal from '@/components/ui/modal';
import {
  createBoard,
  createFolder,
  createList,
  updateBoard,
  updateFolder,
  updateList,
} from '@/services/boards-service';
import { showErrorToast, showSuccessToast } from '@/utils/error-utils';
import { BoardDefaultPermissionRow, BoardMakePrivateRow } from '../components/BoardAccessFieldRows';
import BoardPrivateSharingSetup from '../components/BoardPrivateSharingSetup';

export default function CreateBoardModal({
  board = null,
  createItem = null,
  nextSortOrder = 1,
  onClose,
  onCreated,
}) {
  const isEditMode = Boolean(board?.id);
  const isCreateFolder = createItem?.type === 'folder';
  const isCreateList = createItem?.type === 'list';
  const boardId = board?.id ?? null;
  const isFolder = board?.type === 'folder' || isCreateFolder;
  const isList = board?.type === 'list' || isCreateList;
  const isNameOnly = isFolder || isList;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [defaultPermission, setDefaultPermission] = useState('full_access');
  const [attachedRoles, setAttachedRoles] = useState([]);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (createItem?.context) {
      setName(createItem.context.title ?? '');
      setDescription('');
      setIsPrivate(false);
      setDefaultPermission('full_access');
      setAttachedRoles([]);
      setInvitedUsers([]);
      setError(null);
      return;
    }

    if (!boardId) {
      setName('');
      setDescription('');
      setIsPrivate(false);
      setDefaultPermission('full_access');
      setAttachedRoles([]);
      setInvitedUsers([]);
      setError(null);
      return;
    }

    setName(board?.label ?? '');
    setDescription(board?.description ?? '');
    setIsPrivate(Boolean(board?.isPrivate));
    setError(null);
  }, [
    boardId,
    board?.label,
    board?.description,
    board?.isPrivate,
    createItem?.type,
    createItem?.context?.title,
  ]);

  const handlePrivateChange = (checked) => {
    setIsPrivate(checked);
    if (checked) {
      return;
    }
    setAttachedRoles([]);
    setInvitedUsers([]);
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!name.trim()) {
      setError(
        isFolder
          ? 'Folder name is required.'
          : isList
            ? 'List name is required.'
            : 'Board name is required.',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const trimmedName = name.trim();
    const payload = {
      title: trimmedName,
      description: description.trim(),
      is_private: isPrivate ? 1 : 0,
    };

    try {
      let result;

      if (isCreateFolder) {
        result = await createFolder({
          title: trimmedName,
          space: createItem.context.spaceId,
          parent_folder: createItem.context.parentFolder,
        });
      } else if (isCreateList) {
        result = await createList({
          title: trimmedName,
          folder: createItem.context.folder,
          space: createItem.context.space,
        });
      } else if (isEditMode) {
        result = isFolder
          ? await updateFolder(boardId, payload)
          : isList
            ? await updateList(boardId, payload)
            : await updateBoard(boardId, payload);
      } else {
        result = await createBoard({
          ...payload,
          sort_order: nextSortOrder,
          default_permission: isPrivate ? 'full_access' : defaultPermission,
          shared_roles: isPrivate ? attachedRoles : [],
          invite_users: isPrivate ? invitedUsers : [],
        });
      }

      if (result.error) {
        setError(result.error);
        showErrorToast(result.error);
        return;
      }

      showSuccessToast(
        isCreateFolder
          ? 'Folder created successfully.'
          : isCreateList
            ? 'List created successfully.'
            : isEditMode
              ? isFolder
                ? 'Folder updated successfully.'
                : isList
                  ? 'List updated successfully.'
                  : 'Board updated successfully.'
              : 'Board created successfully.',
      );
      onCreated?.(result.data);
    } catch (submitError) {
      const message = submitError?.message || 'Something went wrong. Please try again.';
      setError(message);
      showErrorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open && !isSubmitting) {
      onClose?.();
    }
  };

  const modalTitle = isCreateFolder
    ? 'Create Folder'
    : isCreateList
      ? 'Create List'
      : isEditMode
        ? isFolder
          ? 'Rename Folder'
          : isList
            ? 'Rename List'
            : 'Edit Board'
        : 'Create a Board';

  const nameLabel = isFolder ? 'Folder Name' : isList ? 'List Name' : 'Board Name';
  const namePlaceholder = isFolder
    ? 'Enter folder name'
    : isList
      ? 'Enter list name'
      : 'Enter board name';

  return (
    <Modal.Root open onOpenChange={handleOpenChange}>
      <Modal.Content className='max-w-[480px] rounded-[20px] p-0 shadow-[0px_16px_40px_-8px_rgba(88,92,95,0.16)]'>
        <Modal.Header className='border-b border-stroke-soft-200 px-8 py-5 before:hidden'>
          <div className='flex min-w-0 flex-1 flex-col gap-1 pr-8'>
            <Modal.Title className='text-lg font-medium leading-6 tracking-[-0.27px] text-text-main-900'>
              {modalTitle}
            </Modal.Title>
            {!isNameOnly ? (
              <Modal.Description className='text-sm leading-5 tracking-[-0.084px] text-text-sub-500'>
                Build a flexible workspace using folders and lists to organize work, processes, and
                teams.
              </Modal.Description>
            ) : null}
          </div>
        </Modal.Header>

        <Modal.Body className='space-y-4 px-8 pb-8 pt-6'>
          {error ? (
            <div className='rounded-lg bg-error-lighter px-3 py-2 text-paragraph-sm text-error-base'>
              {error}
            </div>
          ) : null}

          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1'>
              <Label.Root className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
                {nameLabel}
                <Label.Asterisk />
              </Label.Root>

              <Input.Root size='small'>
                <Input.Wrapper>
                  <Input.Input
                    type='text'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={namePlaceholder}
                    autoFocus
                    disabled={isSubmitting}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            {!isNameOnly ? (
              <div className='flex flex-col gap-1'>
                <Label.Root className='text-sm font-medium leading-5 tracking-[-0.084px] text-text-main-900'>
                  Description
                </Label.Root>

                <Input.Root size='small'>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder='Type here..'
                      disabled={isSubmitting}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            ) : null}
          </div>

          {!isNameOnly ? (
            <div className='flex flex-col gap-4'>
              {!isPrivate ? (
                <BoardDefaultPermissionRow
                  value={defaultPermission}
                  onChange={setDefaultPermission}
                  disabled={isSubmitting}
                />
              ) : null}

              <BoardMakePrivateRow
                checked={isPrivate}
                onCheckedChange={handlePrivateChange}
                disabled={isSubmitting}
              />

              {isPrivate ? (
                <BoardPrivateSharingSetup
                  attachedRoles={attachedRoles}
                  onAttachedRolesChange={setAttachedRoles}
                  invitedUsers={invitedUsers}
                  onInvitedUsersChange={setInvitedUsers}
                  disabled={isSubmitting}
                />
              ) : null}
            </div>
          ) : null}
        </Modal.Body>

        <Modal.Footer className='justify-end gap-3 border-t border-stroke-soft-200 px-8 py-6 before:hidden'>
          <Button.Root
            type='button'
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button.Root>

          <Button.Root
            type='button'
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? isEditMode
                ? 'Saving...'
                : 'Creating...'
              : isEditMode
                ? 'Save'
                : 'Create'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
