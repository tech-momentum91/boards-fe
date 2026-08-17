import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RiArrowRightLine, RiCheckboxCircleFill, RiMicLine, RiStopFill } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { showErrorToast } from '@/utils/error-utils';
import { processVoiceTicket, selectVoiceTicketIsLoading } from '@/redux/voiceTicketSlice';

const fmtSeconds = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const buildVoiceJson = ({ durationSeconds }) => {
  const duration = fmtSeconds(durationSeconds || 0);
  // NOTE: This is a placeholder payload. Replace with real voice -> JSON extraction when backend/API is ready.
  const transcript = `Voice note recorded. Duration: ${duration}.`;

  const toISODate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dueDate = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  return {
    // Fields that map to the Ticket create drawer schema
    ticket_title: `Voice Lead (${duration})`,
    custom_ticket_type: 'Internal ticket',
    status: 'Open',
    description: transcript,
    // Defaults so you can verify the drawer fields populate correctly
    category: 'facility',
    sub_category: 'hvac',
    sub_sub_category: '',
    priority: 'Medium',
    severity: '',
    center: '',
    floor_zone: '',
    due_date: dueDate,
    assign_to: '',
    client_comments: '',
    internal_comments: transcript,
    visible_to_client: false,
    customer: '',

    // Extra diagnostic data we can show in JSON preview
    voice_transcript: transcript,
    voice_meta: { durationSeconds: durationSeconds || 0 },
  };
};

const VoiceModal = ({ open, onOpenChange, onDone }) => {
  const dispatch = useDispatch();
  const [recording, setRecording] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [waveTick, setWaveTick] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const isProcessingVoice = useSelector(selectVoiceTicketIsLoading);

  const timerRef = useRef(null);
  const waveTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const isCancelledRef = useRef(false);

  const canUseMediaRecorder = useMemo(
    () => typeof window !== 'undefined' && 'MediaRecorder' in window,
    [],
  );

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    timerRef.current = null;
    waveTimerRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    chunksRef.current = [];
  };

  const resetState = () => {
    setRecording(false);
    setSaved(false);
    setSeconds(0);
    setWaveTick(0);
    setAudioBlob(null);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      isCancelledRef.current = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // When modal is closed, reset local state so opening it again starts fresh.
    if (!open) {
      isCancelledRef.current = true;
      cleanup();
      resetState();
    } else {
      isCancelledRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      showErrorToast('Microphone access is not supported in this browser.');
      return;
    }

    if (!canUseMediaRecorder) {
      showErrorToast('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setSaved(false);
      setAudioBlob(null);
      setSeconds(0);
      setWaveTick(Date.now());
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = (() => {
        // Prefer a webm type if the browser supports it.
        const candidate = 'audio/webm';
        return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(candidate)
          ? candidate
          : undefined;
      })();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event?.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (isCancelledRef.current) return;

        const chunks = chunksRef.current;
        const blob =
          chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null;

        setAudioBlob(blob);
        setSaved(true);

        // Ensure microphone is off after recording stops.
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();

      setRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      waveTimerRef.current = setInterval(() => setWaveTick(Date.now()), 150);
    } catch {
      cleanup();
      resetState();
      showErrorToast('Microphone access denied.');
      // Intentionally not surfacing the full error; UI only needs a friendly message.
    }
  };

  const stopRecording = () => {
    setRecording(false);
    // Immediately move UI into "saved" state to avoid start button flicker
    // while MediaRecorder is finalizing the blob in its `onstop` handler.
    setSaved(true);

    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    timerRef.current = null;
    waveTimerRef.current = null;

    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // If stop fails, fall back to marking saved and turning off mic.
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setAudioBlob(null);
    }
  };

  const handleClose = () => {
    cleanup();
    onOpenChange?.(false);
  };

  // NOTE: "Continue to Submit Form" is handled by the async `handleDone` below.

  const waveformBars = useMemo(() => Array.from({ length: 18 }), []);

  const handleDone = async () => {
    if (isProcessingVoice) return;
    if (!audioBlob) {
      showErrorToast('Voice audio is not ready yet. Please try again.');
      return;
    }
    try {
      const voiceJson = await dispatch(processVoiceTicket({ blob: audioBlob })).unwrap();

      // Pass the extracted JSON to the ticket drawer.
      onDone?.({ audioBlob, durationSeconds: seconds, voiceJson });
      onOpenChange?.(false);
    } catch (error) {
      // Fallback: if API fails, keep the UX working with placeholder data.
      // (If you want strict behavior, we can remove the fallback.)
      const fallbackVoiceJson = buildVoiceJson({ durationSeconds: seconds });
      onDone?.({ audioBlob, durationSeconds: seconds, voiceJson: fallbackVoiceJson });
      showErrorToast(error, { defaultMessage: 'Failed to process voice. Using fallback JSON.' });
      onOpenChange?.(false);
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={(next) => (!next ? handleClose() : onOpenChange?.(true))}>
      <Modal.Content className='max-w-[450px]'>
        <Modal.Header
          title='Add Ticket via Voice Note'
          description='Record a short voice note, then continue to submit the form.'
          icon={
            <span className='p-2 bg-primary-lighter rounded-lg'>
              <RiMicLine size={20} className='text-primary-base' />
            </span>
          }
        />

        <Modal.Body className='px-5 py-6'>
          <div className='flex flex-col items-center gap-5'>
            {/* Waveform animation */}
            <div className='flex items-center justify-center gap-1 h-12'>
              {waveformBars.map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${recording ? 'bg-primary-base' : 'bg-stroke-soft-200'}`}
                  style={{
                    height: recording
                      ? `${12 + Math.abs(Math.sin(waveTick / 200 + i)) * 26}px`
                      : '8px',
                    animation: recording
                      ? `pulse ${0.4 + (i % 4) * 0.15}s ease-in-out infinite alternate`
                      : 'none',
                  }}
                />
              ))}
            </div>

            <p className='text-label-md font-bold text-text-main-900 tabular-nums'>
              {fmtSeconds(seconds)}
            </p>

            {!recording && !saved && (
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='w-full'
                onClick={startRecording}
              >
                <RiMicLine className='shrink-0' />
                Start Recording
              </Button.Root>
            )}

            {recording && (
              <Button.Root
                type='button'
                variant='error'
                mode='filled'
                size='small'
                className='w-full'
                onClick={stopRecording}
              >
                <RiStopFill className='shrink-0' />
                Stop Recording
              </Button.Root>
            )}

            {saved && (
              <div className='flex flex-col items-center gap-3 w-full'>
                {audioBlob ? (
                  <>
                    <div className='flex items-center gap-2 text-primary-base font-semibold text-label-sm'>
                      <RiCheckboxCircleFill className='w-4 h-4' />
                      Voice note saved
                    </div>
                    <Button.Root
                      type='button'
                      variant='primary'
                      mode='filled'
                      size='small'
                      className='w-full'
                      onClick={handleDone}
                      disabled={isProcessingVoice}
                    >
                      {isProcessingVoice ? (
                        <span className='flex items-center justify-center gap-2'>
                          <span className='h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin' />
                          Processing...
                        </span>
                      ) : (
                        <>
                          Continue to Submit Form <RiArrowRightLine className='w-4 h-4' />
                        </>
                      )}
                    </Button.Root>
                  </>
                ) : (
                  <div className='flex items-center justify-center w-full'>
                    <span className='flex items-center justify-center gap-2 text-label-sm text-text-sub-500'>
                      <span className='h-4 w-4 rounded-full border-2 border-stroke-soft-200 border-t-text-sub-500 animate-spin' />
                      Finalizing audio...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <style>{`
            @keyframes pulse {
              from { transform: scaleY(1); }
              to { transform: scaleY(1.8); }
            }
          `}</style>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

export default VoiceModal;
