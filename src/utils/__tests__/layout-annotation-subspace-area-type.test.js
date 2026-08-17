import { resolveSubSpaceAreaTypeFromDefineForm } from '../layout-annotation-define-subspace-form.js';

describe('resolveSubSpaceAreaTypeFromDefineForm', () => {
  it('uses productionAreaType for Production Area', () => {
    expect(
      resolveSubSpaceAreaTypeFromDefineForm({
        subSpaceType: 'Production Area',
        productionAreaType: 'Hot Desk',
      }),
    ).toBe('Hot Desk');
  });

  it('uses resourceType for Resource', () => {
    expect(
      resolveSubSpaceAreaTypeFromDefineForm({
        subSpaceType: 'Resource',
        resourceType: 'Meeting Room',
      }),
    ).toBe('Meeting Room');
  });

  it('uses commonAreaType for Common Area', () => {
    expect(
      resolveSubSpaceAreaTypeFromDefineForm({
        subSpaceType: 'Common Area',
        commonAreaType: 'Reception',
      }),
    ).toBe('Reception');
  });

  it('returns null when area type field is empty', () => {
    expect(
      resolveSubSpaceAreaTypeFromDefineForm({
        subSpaceType: 'Production Area',
        productionAreaType: '',
      }),
    ).toBeNull();
  });
});
