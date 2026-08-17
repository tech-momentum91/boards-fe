import { resolveCanvasSafeImageUrl } from '@/utils/canvas-safe-image';

const ENCODED_S3_LAYOUT_IMAGE =
  'https://s3.ap-south-1.amazonaws.com/devx-erp-app/uat/2026/05/06/Center%20Floor%20Detail/JAEYWGQW_2nd_FLOOR_THE_FIRST_FURNITURE_LAYOUT-1.jpg';

describe('canvas-safe-image with get_layout_detail S3 layout_image', () => {
  it('fetches S3 image with omit credentials (ACAO * rejects include)', async () => {
    const fakeBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, blob: async () => fakeBlob });
    global.fetch = fetchMock;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-floor-plan');
    global.URL.revokeObjectURL = jest.fn();

    const result = await resolveCanvasSafeImageUrl(ENCODED_S3_LAYOUT_IMAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(ENCODED_S3_LAYOUT_IMAGE, { credentials: 'omit' });
    expect(result.fetchedAsBlob).toBe(true);
    expect(result.url).toBe('blob:mock-floor-plan');
    expect(typeof result.revoke).toBe('function');
  });

  it('retries with include when anonymous API fetch returns 403', async () => {
    const fakeBlob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const apiUrl = 'https://erp-api.devx.work/files/layout.jpg';
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, blob: async () => new Blob() })
      .mockResolvedValueOnce({ ok: true, blob: async () => fakeBlob });
    global.fetch = fetchMock;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-api-layout');
    global.URL.revokeObjectURL = jest.fn();

    const result = await resolveCanvasSafeImageUrl(apiUrl);

    expect(fetchMock).toHaveBeenNthCalledWith(1, apiUrl, { credentials: 'omit' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, apiUrl, { credentials: 'include' });
    expect(result.url).toBe('blob:mock-api-layout');
  });

  it('passes through data URLs unchanged', async () => {
    const dataUrl = 'data:image/png;base64,abc';
    const result = await resolveCanvasSafeImageUrl(dataUrl);
    expect(result.url).toBe(dataUrl);
    expect(result.fetchedAsBlob).toBeUndefined();
  });
});
