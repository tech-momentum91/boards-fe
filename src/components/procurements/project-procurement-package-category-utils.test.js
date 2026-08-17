import {
  buildPackageCategoryFilterKey,
  getPackageCategoryFilterKeys,
} from '@/components/procurements/project-procurement-package-category-utils';

const packageRow = {
  categoryHierarchy: [
    {
      categoryGroup: 'Interiors',
      categoryType: 'Furniture',
      productGroup: 'Workstations',
      productType: 'Modular',
    },
  ],
};

test('builds the package filter key from an Item Group API selection', () => {
  expect(buildPackageCategoryFilterKey(packageRow.categoryHierarchy[0], 2)).toBe(
    'productGroup:Interiors > Furniture > Workstations',
  );
});

test('a package matches every ancestor category option', () => {
  expect([...getPackageCategoryFilterKeys(packageRow)]).toEqual([
    'categoryGroup:Interiors',
    'categoryType:Interiors > Furniture',
    'productGroup:Interiors > Furniture > Workstations',
    'productType:Interiors > Furniture > Workstations > Modular',
  ]);
});
