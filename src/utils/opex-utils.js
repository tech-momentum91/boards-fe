/**
 * Calculates OPEX progress percentage and color based on upload status.
 *
 * Orange - 40% - until facility manager changes the status to uploaded
 * Blue - 80% - until ZOHO changes the status to uploaded
 * Green - 100% - Once ZOHO changes the status to uploaded
 *
 * @param {string} billUploaded - The status of the bill upload (e.g., 'Uploaded', 'Not Uploaded')
 * @param {string} zohoUploaded - The status of the Zoho upload (e.g., 'Done', 'Pending')
 * @returns {{ percentage: number, color: string }}
 */
export const getOpexProgress = (billUploaded, zohoUploaded) => {
  const billStatus = String(billUploaded || '')
    .trim()
    .toLowerCase();
  const zohoStatus = String(zohoUploaded || '')
    .trim()
    .toLowerCase();

  if (zohoStatus === 'done') {
    return { percentage: 100, color: 'green' };
  }
  if (billStatus === 'uploaded') {
    return { percentage: 80, color: 'blue' };
  }
  return { percentage: 40, color: 'orange' };
};
