jest.mock('@/components/stocks/shared/api/multipart-api', () => ({
  filterStocksUploadFiles: jest.fn((files) => files),
  postStocksMultipartRequest: jest.fn(),
}));

import { parseVendorRcListMessage } from '../vendor-rc-api';

describe('parseVendorRcListMessage', () => {
  it('parses flat data', () => {
    const parsed = parseVendorRcListMessage({
      data: [{ name: 'VRC-1', supplier_name: 'Acme', custom_categories: 'Cleaning' }],
    });
    expect(parsed.isGrouped).toBe(false);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].vendor).toBe('Acme');
  });

  it('parses grouped results[].entries', () => {
    const parsed = parseVendorRcListMessage({
      group_by: 'supplier',
      results: [
        {
          group_key: 'Acme',
          group_label: 'Acme',
          item_count: 1,
          entries: [{ name: 'VRC-1', supplier_name: 'Acme', custom_categories: 'Cleaning' }],
        },
      ],
    });
    expect(parsed.isGrouped).toBe(true);
    expect(parsed.groups[0].id).toBe('supplier-acme');
    expect(parsed.groups[0].rows[0].id).toBe('VRC-1');
  });
});
