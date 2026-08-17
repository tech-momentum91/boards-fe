import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import voiceTicketService from '@/services/voice-ticket-service';

const extractVoiceJson = (raw) => {
  // Backend sometimes wraps the payload under `message`
  // e.g. { message: { ready, transcript, ticket, ... } }
  const extracted = raw?.message ?? raw;

  if (extracted && typeof extracted === 'object') {
    return {
      ...extracted,
      preprocess_text: raw?.preprocess_text ?? raw?.preprocessText ?? raw?.preprocess,
    };
  }

  return extracted;
};

export const processVoiceTicket = createAsyncThunk(
  'voiceTicket/processVoiceTicket',
  async ({ blob }, { rejectWithValue }) => {
    try {
      if (!blob) {
        throw new Error('Audio blob is missing');
      }
      const raw = await voiceTicketService.processMicAudio(blob);
      return extractVoiceJson(raw);
    } catch (error) {
      return rejectWithValue(error.serialized || error.message || error);
    }
  },
);

const initialState = {
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  voiceJson: null,
};

const voiceTicketSlice = createSlice({
  name: 'voiceTicket',
  initialState,
  reducers: {
    clearVoiceTicketState(state) {
      state.status = 'idle';
      state.error = null;
      state.voiceJson = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processVoiceTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.voiceJson = null;
      })
      .addCase(processVoiceTicket.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.voiceJson = action.payload || null;
      })
      .addCase(processVoiceTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message || null;
      });
  },
});

export const { clearVoiceTicketState } = voiceTicketSlice.actions;

export const selectVoiceTicketStatus = (state) => state.voiceTicket?.status;
export const selectVoiceTicketIsLoading = (state) => state.voiceTicket?.status === 'loading';
export const selectVoiceTicketVoiceJson = (state) => state.voiceTicket?.voiceJson;

export default voiceTicketSlice.reducer;
