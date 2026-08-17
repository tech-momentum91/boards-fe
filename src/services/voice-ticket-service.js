import apiClient from '@/api/axios';

/**
 * Voice ticket service
 * Calls devx_ai.voice_ticket.api.mic_endpoint with multipart audio upload.
 */
class VoiceTicketService {
  async processMicAudio(blob) {
    const formData = new FormData();
    const file = new File([blob], 'voice-note.webm', { type: blob?.type || 'audio/webm' });

    // Backend expects multipart/form-data with `audio` field name.
    formData.append('audio', file);

    const response = await apiClient.post(
      '/method/devx_ai.voice_ticket.api.mic_endpoint',
      formData,
    );

    return response.data;
  }
}

const voiceTicketService = new VoiceTicketService();
export default voiceTicketService;
