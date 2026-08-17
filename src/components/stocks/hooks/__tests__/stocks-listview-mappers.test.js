import {
  mapProductMasterGroupByToApi,
  mapStockRulesGroupByToApi,
} from '../stocks-listview-mappers';

describe('mapProductMasterGroupByToApi', () => {
  it('maps UI keys to API fields', () => {
    expect(mapProductMasterGroupByToApi('')).toBe('');
    expect(mapProductMasterGroupByToApi('category')).toBe('item_group');
    expect(mapProductMasterGroupByToApi('type')).toBe('custom_type');
    expect(mapProductMasterGroupByToApi('status')).toBe('disabled');
  });
});

describe('mapStockRulesGroupByToApi', () => {
  it('maps UI keys to API fields', () => {
    expect(mapStockRulesGroupByToApi('')).toBe('');
    expect(mapStockRulesGroupByToApi('center')).toBe('center');
    expect(mapStockRulesGroupByToApi('category')).toBe('item_group');
    expect(mapStockRulesGroupByToApi('pattern')).toBe('custom_consumption');
    expect(mapStockRulesGroupByToApi('frequency')).toBe('custom_frequency');
  });
});
