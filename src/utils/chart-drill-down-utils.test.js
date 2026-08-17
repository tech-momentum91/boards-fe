import {
  buildDrillDownFilter,
  drillDownToConditions,
  filterRowsByDrillDown,
  formatDrillDownFilterLabel,
  isDrillDownSegmentActive,
  mergeDrillDownIntoFilters,
} from './chart-drill-down-utils';

describe('chart-drill-down-utils', () => {
  const chatbotConfig = {
    x_axis: { doctype: 'Center', fieldname: 'center_name', label: 'Center Name' },
    group_by: [{ doctype: 'Client', fieldname: 'client_name', label: 'Client' }],
  };

  test('buildDrillDownFilter maps click payload to filter object', () => {
    const filter = buildDrillDownFilter(
      { index: 1, label: 'Downtown', value: 12, groupValue: 'Acme' },
      chatbotConfig,
    );

    expect(filter).toMatchObject({
      index: 1,
      label: 'Downtown',
      groupValue: 'Acme',
      xAxisFieldname: 'center_name',
      xAxisDoctype: 'Center',
      groupFieldname: 'client_name',
    });
  });

  test('mergeDrillDownIntoFilters appends conditions to existing filters', () => {
    const filter = buildDrillDownFilter({ index: 0, label: 'Downtown', value: 5 }, chatbotConfig);
    const merged = mergeDrillDownIntoFilters(
      {
        logic: 'AND',
        conditions: [{ doctype: 'Center', fieldname: 'status', operator: '=', value: 'Open' }],
      },
      filter,
    );

    expect(merged.conditions).toHaveLength(2);
    expect(merged.conditions[1]).toMatchObject({
      doctype: 'Center',
      fieldname: 'center_name',
      value: 'Downtown',
    });
  });

  test('filterRowsByDrillDown filters raw rows by x_axis and group_0', () => {
    const rows = [
      { x_axis: 'Downtown', y_axis: 10, group_0: 'Acme' },
      { x_axis: 'Downtown', y_axis: 5, group_0: 'Beta' },
      { x_axis: 'Uptown', y_axis: 3, group_0: 'Acme' },
    ];
    const filter = buildDrillDownFilter(
      { index: 0, label: 'Downtown', value: 15, groupValue: 'Acme' },
      chatbotConfig,
    );

    expect(filterRowsByDrillDown(rows, filter)).toEqual([rows[0]]);
  });

  test('isDrillDownSegmentActive respects group segment selection', () => {
    const filter = buildDrillDownFilter(
      { index: 2, label: 'Downtown', value: 4, groupValue: 'Acme' },
      chatbotConfig,
    );

    expect(isDrillDownSegmentActive(filter, { index: 2, groupValue: 'Acme' })).toBe(true);
    expect(isDrillDownSegmentActive(filter, { index: 2, groupValue: 'Beta' })).toBe(false);
    expect(isDrillDownSegmentActive(filter, { index: 1, groupValue: 'Acme' })).toBe(false);
  });

  test('formatDrillDownFilterLabel renders readable filter text', () => {
    const filter = buildDrillDownFilter(
      { index: 0, label: 'Downtown', value: 1, groupValue: 'Acme' },
      chatbotConfig,
    );

    expect(formatDrillDownFilterLabel(filter)).toContain('Center Name = "Downtown"');
    expect(formatDrillDownFilterLabel(filter)).toContain('Client = "Acme"');
    expect(drillDownToConditions(filter)).toHaveLength(2);
  });
});
