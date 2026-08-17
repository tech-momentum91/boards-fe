import { cn } from '@/utils/cn';

const BAR_KEYS = ['a', 'b', 'c', 'd', 'e'];

/**
 * Audio-style vertical bars for “listening” / dictation UI.
 * Styling uses `currentColor` — set `text-*` on this element or a parent.
 */
export function VoiceWaveIndicator({ className }) {
  return (
    <span className={cn('voice-wave-indicator pointer-events-none', className)} aria-hidden>
      {BAR_KEYS.map((key) => (
        <span key={key} className='voice-wave-indicator__bar' />
      ))}
    </span>
  );
}
