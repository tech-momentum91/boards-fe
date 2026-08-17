/**
 * Normalizes call recording transcript payloads for the detail view.
 * Supports future API shapes until a dedicated transcript endpoint exists.
 */

const TRANSCRIPT_FIELD_KEYS = [
  'transcript_messages',
  'transcribed_data',
  'call_transcription',
  'transcript',
  'transcription',
  'call_transcript',
  'transcript_data',
];

function parseTranscriptRaw(raw) {
  if (raw == null) return [];

  let data = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      data = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray(data.messages)) return data.messages;
    if (Array.isArray(data.segments)) return data.segments;
    if (Array.isArray(data.items)) return data.items;
  }

  return [];
}

function normalizeRole(raw) {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase();

  if (!value) return 'Caller';
  if (value === 'devx' || value === 'agent' || value === 'staff' || value === 'outbound') {
    return 'DevX';
  }
  if (value === 'caller' || value === 'customer' || value === 'client' || value === 'inbound') {
    return 'Caller';
  }
  return raw;
}

function formatTimestampSeconds(totalSeconds) {
  const seconds = Number(totalSeconds);
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function normalizeTimestamp(raw) {
  if (raw == null || raw === '') return '00:00';
  if (typeof raw === 'number' && Number.isFinite(raw)) return formatTimestampSeconds(raw);
  const text = String(raw).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return formatTimestampSeconds(Number(text));
  return text || '00:00';
}

function normalizeTranscriptMessage(item, index) {
  if (!item || typeof item !== 'object') return null;

  const text = String(
    item.text ?? item.message ?? item.content ?? item.transcript ?? item.speech ?? '',
  ).trim();

  if (!text) return null;

  const speakerName = String(
    item.speaker_name ?? item.speaker ?? item.name ?? item.user_name ?? 'Unknown',
  ).trim();

  const role = normalizeRole(
    item.role ??
      item.speaker_role ??
      item.speaker_type ??
      (item.is_caller ? 'Caller' : item.is_agent ? 'DevX' : undefined) ??
      (item.direction === 'outbound'
        ? 'DevX'
        : item.direction === 'inbound'
          ? 'Caller'
          : undefined),
  );

  return {
    id: item.id ?? item.name ?? `transcript-${index}`,
    speakerName: speakerName || 'Unknown',
    role,
    timestamp: normalizeTimestamp(item.timestamp ?? item.time ?? item.offset ?? item.start_time),
    text,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @returns {Array<{ id: string, speakerName: string, role: string, timestamp: string, text: string }>}
 */
export function extractCallRecordingTranscriptMessages(record) {
  if (!record) return [];

  for (const key of TRANSCRIPT_FIELD_KEYS) {
    const messages = parseTranscriptRaw(record[key])
      .map(normalizeTranscriptMessage)
      .filter(Boolean);
    if (messages.length > 0) return messages;
  }

  return [];
}
