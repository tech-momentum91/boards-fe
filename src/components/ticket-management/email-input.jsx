import React, { useState, useRef } from 'react';
import { RiSendPlaneLine, RiCloseLine, RiAttachment2 } from 'react-icons/ri';
import * as CompactButton from '@/components/ui/compact-button';
import * as Textarea from '@/components/ui/textarea';
import * as Input from '@/components/ui/input';
import * as Tag from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/file-utils';
import { showErrorToast } from '@/utils/error-utils';
import * as Button from '@/components/ui/button';
import * as LinkButton from '@/components/ui/link-button';
const EmailInput = ({
  onSubmit,
  isSubmitting = false,
  placeholder = 'Type your message...',
  className,
  defaultTo = [],
  defaultCc = [],
  defaultBcc = [],
}) => {
  const [toEmails, setToEmails] = useState((defaultTo || []).map((email) => email.toLowerCase()));
  const [toInput, setToInput] = useState('');
  const [ccEmails, setCcEmails] = useState((defaultCc || []).map((email) => email.toLowerCase()));
  const [ccInput, setCcInput] = useState('');
  const [bccEmails, setBccEmails] = useState(
    (defaultBcc || []).map((email) => email.toLowerCase()),
  );
  const [bccInput, setBccInput] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const fileInputRef = useRef(null);
  const toInputRef = useRef(null);
  const ccInputRef = useRef(null);
  const bccInputRef = useRef(null);

  const addEmail = (emailList, setEmailList, input, setInput) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Split by comma and add all emails
    const emails = trimmed
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .filter((email) => {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      });

    if (emails.length === 0) {
      showErrorToast('Please enter a valid email address', {
        position: 'bottom-right',
      });
      return;
    }

    // Add emails that aren't already in the list (case-insensitive comparison)
    const emailListLower = emailList.map((e) => e.toLowerCase());
    const newEmails = emails.filter((email) => !emailListLower.includes(email));
    if (newEmails.length > 0) {
      setEmailList([...emailList, ...newEmails]);
    }
    setInput('');
  };

  const removeEmail = (emailList, setEmailList, emailToRemove) => {
    setEmailList(emailList.filter((email) => email !== emailToRemove));
  };

  const handleToKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(toEmails, setToEmails, toInput, setToInput);
    } else if (e.key === 'Backspace' && toInput === '' && toEmails.length > 0) {
      // Remove last email if backspace on empty input
      removeEmail(toEmails, setToEmails, toEmails.at(-1));
    }
  };

  const handleCcKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(ccEmails, setCcEmails, ccInput, setCcInput);
    } else if (e.key === 'Backspace' && ccInput === '' && ccEmails.length > 0) {
      removeEmail(ccEmails, setCcEmails, ccEmails.at(-1));
    }
  };

  const handleBccKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(bccEmails, setBccEmails, bccInput, setBccInput);
    } else if (e.key === 'Backspace' && bccInput === '' && bccEmails.length > 0) {
      removeEmail(bccEmails, setBccEmails, bccEmails.at(-1));
    }
  };

  const handleSubmit = async () => {
    // Validate that at least 'to' field has content and message has content
    if (toEmails.length === 0) {
      showErrorToast('Please enter at least one recipient email address', {
        position: 'bottom-right',
      });
      return;
    }

    if (!content.trim() && attachments.length === 0) {
      showErrorToast('Please enter a message or attach a file', {
        position: 'bottom-right',
      });
      return;
    }

    try {
      await onSubmit({
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        subject: '',
        content: content.trim(),
        attachments,
      });

      // Reset form after successful submission
      setToEmails((defaultTo || []).map((email) => email.toLowerCase()));
      setToInput('');
      setCcEmails((defaultCc || []).map((email) => email.toLowerCase()));
      setCcInput('');
      setBccEmails((defaultBcc || []).map((email) => email.toLowerCase()));
      setBccInput('');
      setContent('');
      setAttachments([]);
      setIsFocused(false);
      setShowCc(false);
      setShowBcc(false);
    } catch (error) {
      console.error('Failed to send email:', error);
      showErrorToast(error, {
        defaultMessage: 'Failed to send email. Please try again.',
        position: 'bottom-right',
      });
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (event) => {
    const files = [...event.target.files];
    const newAttachments = files.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Math.random().toString(36).slice(2, 11),
    }));

    setAttachments((previous) => [...previous, ...newAttachments]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((previous) => previous.filter((att) => att.id !== attachmentId));
  };

  const hasContent = content.trim() || attachments.length > 0;
  const hasTo = toEmails.length > 0;

  return (
    <div className={cn('', className)}>
      <div
        className={cn(
          'bg-white rounded-lg shadow-regular-xs outline-none ring-1 ring-inset ring-stroke-soft-200 transition duration-200 ease-out',
          isFocused && 'shadow-button-important-focus ring-primary-base',
        )}
      >
        {/* Email Fields */}
        <div className='border-b border-stroke-soft-200 divide-y divide-stroke-soft-200'>
          {/* To Field with CC/BCC buttons on right */}
          <div className='px-3 flex items-center gap-1 py-1'>
            <label className='group flex items-center gap-px aria-disabled:text-text-disabled-300 text-text-soft-400 text-sm w-8'>
              To:
            </label>
            <div className='flex-1 min-w-0'>
              <div className='flex flex-wrap items-center gap-1.5 min-h-[32px]'>
                {toEmails.map((email) => (
                  <Tag.Root key={email} variant='gray'>
                    <span className='text-label-xs text-text-neutral-500'>{email}</span>
                    <Tag.DismissButton
                      onClick={() => removeEmail(toEmails, setToEmails, email)}
                      aria-label={`Remove ${email}`}
                    />
                  </Tag.Root>
                ))}
                <Input.Root
                  noRing
                  className='flex-1 min-w-[120px]'
                  size='xsmall'
                  variant='borderless'
                >
                  <Input.Wrapper>
                    <Input.Input
                      ref={toInputRef}
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={handleToKeyDown}
                      onBlur={() => {
                        setIsFocused(false);
                        if (toInput.trim()) {
                          addEmail(toEmails, setToEmails, toInput, setToInput);
                        }
                      }}
                      onFocus={() => setIsFocused(true)}
                      placeholder={toEmails.length === 0 ? 'Enter email addresses' : ''}
                      className='focus:border-0 focus:ring-0'
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </div>
            {/* CC/BCC Toggle Buttons */}
            <div className='flex items-center gap-1 shrink-0'>
              <LinkButton.Root
                variant={showCc ? 'primary' : 'gray'}
                size='small'
                underline={false}
                onClick={() => {
                  setShowCc(!showCc);
                  if (!showCc && ccInputRef.current) {
                    setTimeout(() => ccInputRef.current?.focus(), 100);
                  }
                }}
              >
                CC
              </LinkButton.Root>
              <LinkButton.Root
                variant={showBcc ? 'primary' : 'gray'}
                size='small'
                underline={false}
                onClick={() => {
                  setShowBcc(!showBcc);
                  if (!showBcc && bccInputRef.current) {
                    setTimeout(() => bccInputRef.current?.focus(), 100);
                  }
                }}
              >
                BCC
              </LinkButton.Root>
            </div>
          </div>

          {/* CC Field - Collapsible */}
          {showCc && (
            <div className='px-3 flex items-center gap-1 py-1'>
              <label className='group flex items-center gap-px aria-disabled:text-text-disabled-300 text-text-soft-400 text-sm w-8'>
                CC:
              </label>
              <div className='flex-1 min-w-0'>
                <div className='flex flex-wrap items-center gap-1.5 min-h-[32px]'>
                  {ccEmails.map((email) => (
                    <Tag.Root key={email} variant='gray'>
                      <span className='text-label-xs text-text-neutral-500'>{email}</span>
                      <Tag.DismissButton
                        onClick={() => removeEmail(ccEmails, setCcEmails, email)}
                        aria-label={`Remove ${email}`}
                      />
                    </Tag.Root>
                  ))}
                  <Input.Root
                    className='flex-1 min-w-[120px]'
                    size='xsmall'
                    variant='borderless'
                    noRing
                  >
                    <Input.Wrapper>
                      <Input.Input
                        ref={ccInputRef}
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={handleCcKeyDown}
                        onBlur={() => {
                          if (ccInput.trim()) {
                            addEmail(ccEmails, setCcEmails, ccInput, setCcInput);
                          }
                        }}
                        onFocus={() => setIsFocused(true)}
                        placeholder={ccEmails.length === 0 ? 'Enter CC email addresses' : ''}
                        className='text-sm border-0 focus:ring-0'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </div>
            </div>
          )}

          {/* BCC Field - Collapsible */}
          {showBcc && (
            <div className='px-3 flex items-center gap-1 py-1'>
              <label className='group flex items-center gap-px aria-disabled:text-text-disabled-300 text-text-soft-400 text-sm w-8'>
                BCC:
              </label>
              <div className='flex-1 min-w-0'>
                <div className='flex flex-wrap items-center gap-1.5 min-h-[32px]'>
                  {bccEmails.map((email) => (
                    <Tag.Root key={email} variant='gray'>
                      <span className='text-label-xs text-text-neutral-500'>{email}</span>
                      <Tag.DismissButton
                        onClick={() => removeEmail(bccEmails, setBccEmails, email)}
                        aria-label={`Remove ${email}`}
                      />
                    </Tag.Root>
                  ))}
                  <Input.Root
                    className='flex-1 min-w-[120px]'
                    size='xsmall'
                    variant='borderless'
                    noRing
                  >
                    <Input.Wrapper>
                      <Input.Input
                        ref={bccInputRef}
                        value={bccInput}
                        onChange={(e) => setBccInput(e.target.value)}
                        onKeyDown={handleBccKeyDown}
                        onBlur={() => {
                          if (bccInput.trim()) {
                            addEmail(bccEmails, setBccEmails, bccInput, setBccInput);
                          }
                        }}
                        onFocus={() => setIsFocused(true)}
                        placeholder={bccEmails.length === 0 ? 'Enter BCC email addresses' : ''}
                        className='text-sm border-0 focus:ring-0'
                      />
                    </Input.Wrapper>
                  </Input.Root>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Input Area */}
        <div className='p-3 pb-1'>
          <Textarea.Root
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='w-full resize-none focus:border-0! p-0 focus:ring-0!'
            variant='borderless'
            containerClassName='border-0! ring-0'
          />

          {/* Attachments Preview - Figma chip style */}
          {attachments.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className='inline-flex items-center gap-1.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1'
                >
                  <RiAttachment2
                    size={16}
                    className='text-text-soft-400 shrink-0'
                    aria-hidden='true'
                  />
                  <div className='flex justify-center items-center gap-1 min-w-0'>
                    <span className='text-sm font-medium text-text-main-900 truncate max-w-[150px]'>
                      {attachment.name}
                    </span>
                    <span className='text-xs text-text-sub-500'>
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                  <CompactButton.Root
                    variant='ghost'
                    size='small'
                    onClick={() => removeAttachment(attachment.id)}
                    className='text-text-soft-400 hover:text-text-strong-950 cursor-pointer'
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <CompactButton.Icon as={RiCloseLine} />
                  </CompactButton.Root>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expanded Controls */}
        <div className='p-3 pt-0 flex items-center justify-end'>
          <div className='flex items-center gap-1'>
            {/* File Attachment */}
            <input
              ref={fileInputRef}
              type='file'
              multiple
              onChange={handleFileSelect}
              className='hidden'
              accept='*/*'
            />
            <CompactButton.Root
              variant='ghost'
              size='large'
              onClick={() => fileInputRef.current?.click()}
              className='text-text-soft-400 hover:text-text-strong-950 p-1 cursor-pointer'
            >
              <CompactButton.Icon as={RiAttachment2} />
            </CompactButton.Root>
            {/* Submit Button */}
            <CompactButton.Root
              size='large'
              onClick={handleSubmit}
              disabled={!hasContent || !hasTo || isSubmitting}
              className='bg-primary-base text-white p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <CompactButton.Icon as={RiSendPlaneLine} />
            </CompactButton.Root>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInput;
