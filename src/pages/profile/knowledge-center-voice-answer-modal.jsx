import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiMicLine, RiStopFill } from 'react-icons/ri';

import * as Button from '@/components/ui/button';
import * as Modal from '@/components/ui/modal';
import { transcribeKnowledgeCenterAudio } from '@/api/knowledgeCenterQa';
import { showErrorToast } from '@/utils/error-utils';

const fmtSeconds = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const WAVEFORM_BAR_KEYS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
];

/** @typedef {'idle' | 'connecting' | 'recording' | 'transcribing'} VoicePhase */

/**
 * Record → Sarvam STT in one flow: opening the modal starts the mic; Stop runs transcribe
 * and {@link onDone} (no extra clicks).
 *
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, onDone?: (ev: { transcript: string, durationSeconds: number, audioBlob: Blob }) => void }} props
 */
export default function KnowledgeCenterVoiceAnswerModal({ open, onOpenChange, onDone }) {
  /** @type {[VoicePhase, React.Dispatch<React.SetStateAction<VoicePhase>>]} */
  const [phase, setPhase] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [waveTick, setWaveTick] = useState(0);

  const onDoneRef = useRef(onDone);
  const onOpenChangeRef = useRef(onOpenChange);
  onDoneRef.current = onDone;
  onOpenChangeRef.current = onOpenChange;

  const timerRef = useRef(null);
  const waveTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const isCancelledRef = useRef(false);
  const secondsAtStopRef = useRef(0);

  const canUseMediaRecorder = useMemo(
    () => typeof window !== 'undefined' && 'MediaRecorder' in window,
    [],
  );

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    timerRef.current = null;
    waveTimerRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();

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
  }, [clearTimers]);

  const resetState = useCallback(() => {
    setPhase('idle');
    setSeconds(0);
    setWaveTick(0);
    clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (!open) {
      isCancelledRef.current = true;
      cleanup();
      resetState();
      return undefined;
    }

    isCancelledRef.current = false;

    if (!navigator?.mediaDevices?.getUserMedia) {
      showErrorToast('Microphone access is not supported in this browser.');
      onOpenChangeRef.current?.(false);
      return undefined;
    }

    if (!canUseMediaRecorder) {
      showErrorToast('Audio recording is not supported in this browser.');
      onOpenChangeRef.current?.(false);
      return undefined;
    }

    const ac = new AbortController();

    const run = async () => {
      setPhase('connecting');
      setSeconds(0);
      setWaveTick(Date.now());
      chunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          signal: ac.signal,
        });
        if (isCancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const mimeType = (() => {
          const candidate = 'audio/webm';
          return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(candidate)
            ? candidate
            : undefined;
        })();

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        const handleDataAvailable = (event) => {
          if (event?.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        const handleStop = async () => {
          if (isCancelledRef.current) {
            return;
          }

          const chunks = chunksRef.current;
          const blob =
            chunks.length > 0
              ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
              : null;

          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
          }

          mediaRecorderRef.current = null;
          chunksRef.current = [];

          if (!blob || blob.size < 100) {
            showErrorToast(new Error('Recording was too short. Try again with a longer note.'));
            if (!isCancelledRef.current) {
              onOpenChangeRef.current?.(false);
            }
            setPhase('idle');
            return;
          }

          try {
            const transcript = await transcribeKnowledgeCenterAudio(blob, 'voice-note.webm');
            if (isCancelledRef.current) {
              return;
            }
            const trimmed = String(transcript ?? '').trim();
            if (!trimmed) {
              showErrorToast(
                new Error('No speech was detected. Try again, closer to the microphone.'),
              );
              onOpenChangeRef.current?.(false);
              setPhase('idle');
              return;
            }
            onDoneRef.current?.({
              transcript: trimmed,
              durationSeconds: secondsAtStopRef.current,
              audioBlob: blob,
            });
            onOpenChangeRef.current?.(false);
          } catch (error) {
            if (!isCancelledRef.current) {
              showErrorToast(error, { defaultMessage: 'Could not transcribe the voice note.' });
            }
          } finally {
            if (!isCancelledRef.current) {
              setPhase('idle');
            }
          }
        };

        recorder.addEventListener('dataavailable', handleDataAvailable);
        recorder.addEventListener('stop', handleStop);

        mediaRecorderRef.current = recorder;
        recorder.start();
        setPhase('recording');
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        waveTimerRef.current = setInterval(() => setWaveTick(Date.now()), 150);
      } catch (error) {
        if (ac.signal.aborted || error?.name === 'AbortError') {
          return;
        }
        cleanup();
        resetState();
        showErrorToast('Microphone access denied.');
        if (!isCancelledRef.current) {
          onOpenChangeRef.current?.(false);
        }
      }
    };

    void run();

    return () => {
      ac.abort();
    };
  }, [canUseMediaRecorder, cleanup, open, resetState]);

  const handleClose = () => {
    isCancelledRef.current = true;
    cleanup();
    resetState();
    onOpenChangeRef.current?.(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'recording') return;
    secondsAtStopRef.current = seconds;
    clearTimers();
    setPhase('transcribing');
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setPhase('idle');
      showErrorToast(new Error('Could not stop recording. Please try again.'));
      onOpenChangeRef.current?.(false);
    }
  };

  const isWaveActive = phase === 'recording' || phase === 'transcribing';

  return (
    <Modal.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChangeRef.current?.(true);
        } else {
          handleClose();
        }
      }}
    >
      <Modal.Content className='max-w-[450px]' overlayClassName='z-[100]'>
        <Modal.Header
          title='Answer via voice note'
          description='Tap stop when you are done — text is added to your answer.'
          icon={
            <span className='rounded-lg bg-primary-lighter p-2'>
              <RiMicLine size={20} className='text-primary-base' />
            </span>
          }
        />

        <Modal.Body className='px-5 py-6'>
          <div className='flex flex-col items-center gap-5'>
            <div className='flex h-12 items-center justify-center gap-1'>
              {WAVEFORM_BAR_KEYS.map((key, i) => (
                <div
                  key={key}
                  className={`w-1 rounded-full transition-all ${isWaveActive ? 'bg-primary-base' : 'bg-stroke-soft-200'}`}
                  style={{
                    height: isWaveActive
                      ? `${12 + Math.abs(Math.sin(waveTick / 200 + i)) * 26}px`
                      : '8px',
                    animation:
                      phase === 'recording'
                        ? `pulse ${0.4 + (i % 4) * 0.15}s ease-in-out infinite alternate`
                        : 'none',
                  }}
                />
              ))}
            </div>

            <p className='text-label-md font-bold tabular-nums text-text-main-900'>
              {phase === 'transcribing'
                ? fmtSeconds(secondsAtStopRef.current)
                : fmtSeconds(seconds)}
            </p>

            {phase === 'connecting' && (
              <div className='flex w-full flex-col items-center gap-2'>
                <span className='flex items-center justify-center gap-2 text-label-sm text-text-sub-500'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-stroke-soft-200 border-t-primary-base' />
                  Starting microphone…
                </span>
              </div>
            )}

            {phase === 'recording' && (
              <Button.Root
                type='button'
                variant='primary'
                mode='filled'
                size='small'
                className='w-full'
                onClick={stopRecording}
              >
                <RiStopFill className='shrink-0' />
                Stop & transcribe
              </Button.Root>
            )}

            {phase === 'transcribing' && (
              <div className='flex w-full flex-col items-center gap-2'>
                <span className='flex items-center justify-center gap-2 text-label-sm text-text-sub-500'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-stroke-soft-200 border-t-primary-base' />
                  Transcribing…
                </span>
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
}
