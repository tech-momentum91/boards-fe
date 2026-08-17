import {
  flattenPagePlan,
  findPageInstance,
  reorderCenterWithinCity,
  reorderCityGroup,
  setPageInstanceEnabled,
} from '@/components/ui/proposal-builder/deck/proposal-page-plan';
import {
  fixtureSingleCenterPagePlan,
  fixtureTwoCentersSameCityPagePlan,
  fixtureTwoCityPagePlan,
} from '@/components/ui/proposal-builder/deck/__tests__/page-plan-fixtures';

describe('proposal-page-plan', () => {
  it('flattens the page plan into a linear sequence', () => {
    const plan = fixtureTwoCityPagePlan();

    expect(flattenPagePlan(plan).map((page) => page.id)).toEqual([
      'page:page1',
      'page:page2',
      'city:ahmedabad',
      'center:CENTER-001:page4',
      'center:CENTER-001:page5',
      'space:INV-001:layout',
      'city:mumbai',
      'center:CENTER-002:page4',
      'center:CENTER-002:page5',
      'space:INV-002:layout',
      'page:page7',
      'page:page8',
      'page:page9',
    ]);
  });

  it('flattens only enabled instances when enabledOnly is true', () => {
    const plan = fixtureSingleCenterPagePlan({
      inventoryId: 'INV-001',
      centerId: 'CENTER-001',
      cityId: 'ahmedabad',
    });

    const withDisabled = setPageInstanceEnabled(plan, 'space:INV-001:layout', false);
    const withCityDisabled = setPageInstanceEnabled(withDisabled, 'city:ahmedabad', false);

    const enabledIds = flattenPagePlan(withCityDisabled, { enabledOnly: true }).map(
      (page) => page.id,
    );
    expect(enabledIds).not.toContain('city:ahmedabad');
    expect(enabledIds).not.toContain('space:INV-001:layout');
    expect(enabledIds).toEqual([
      'page:page1',
      'page:page2',
      'center:CENTER-001:page4',
      'center:CENTER-001:page5',
      'page:page7',
      'page:page8',
      'page:page9',
    ]);
  });

  it('toggles visibility for individual instances', () => {
    const plan = fixtureSingleCenterPagePlan({ inventoryId: 'INV-001', centerId: 'CENTER-001' });

    const layoutId = 'space:INV-001:layout';
    const updated = setPageInstanceEnabled(plan, layoutId, false);

    expect(findPageInstance(updated, layoutId)?.enabled).toBe(false);
    expect(findPageInstance(updated, 'center:CENTER-001:page4')?.enabled).toBe(true);
  });

  it('preserves missing prefix/suffix shapes and referential equality when instance is missing', () => {
    const plan = {
      cities: [
        {
          id: 'city:ahmedabad',
          page: {
            id: 'city:ahmedabad',
            templateKey: 'page3',
            enabled: true,
            binding: { cityId: 'ahmedabad' },
            label: 'National Presence - Ahmedabad',
          },
          centers: [],
        },
      ],
    };

    const unchanged = setPageInstanceEnabled(plan, 'missing-instance', false);
    expect(unchanged).toBe(plan);
    expect(unchanged.prefix).toBeUndefined();
    expect(unchanged.suffix).toBeUndefined();
  });

  it('reorders cities and prevents cross-city center moves', () => {
    const plan = fixtureTwoCityPagePlan();

    const reorderedCities = reorderCityGroup(plan, 'city:mumbai', 'city:ahmedabad');
    expect(reorderedCities.cities.map((city) => city.id)).toEqual([
      'city:mumbai',
      'city:ahmedabad',
    ]);

    const rejected = reorderCenterWithinCity(
      plan,
      'city:ahmedabad',
      'center:CENTER-001',
      'center:CENTER-002',
    );
    expect(rejected).toBe(plan);
  });

  it('reorders centers within the same city', () => {
    const plan = fixtureTwoCentersSameCityPagePlan();

    expect(plan.cities[0].centers.map((center) => center.id)).toEqual([
      'center:CENTER-001',
      'center:CENTER-002',
    ]);

    const reordered = reorderCenterWithinCity(
      plan,
      'city:ahmedabad',
      'center:CENTER-002',
      'center:CENTER-001',
    );

    expect(reordered.cities[0].centers.map((center) => center.id)).toEqual([
      'center:CENTER-002',
      'center:CENTER-001',
    ]);
    expect(reordered.cities[0].page).toBe(plan.cities[0].page);
  });
});
