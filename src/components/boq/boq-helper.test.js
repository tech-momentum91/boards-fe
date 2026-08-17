import {
  buildProjectBoqApiFilters,
  buildProjectBoqFilterOptionsByTab,
} from '@/components/boq/boq-helper';

test('maps dynamic Project BOQ filter options into their tabs', () => {
  const options = buildProjectBoqFilterOptionsByTab({
    project: [{ value: 'PROJ-1', label: 'Project One' }],
    boqType: [{ value: 'main', label: 'Main' }],
  });

  expect(options.project).toEqual([{ value: 'PROJ-1', label: 'Project One' }]);
  expect(options.boqType).toEqual([{ value: 'main', label: 'Main' }]);
});

test('sends selected project and BOQ type filters to the listing API', () => {
  expect(
    buildProjectBoqApiFilters({
      clientValue: [0],
      project: ['PROJ-1'],
      boqType: ['design'],
    }),
  ).toEqual({
    clientValue: [0],
    project: ['PROJ-1'],
    boqType: ['design'],
  });
});
