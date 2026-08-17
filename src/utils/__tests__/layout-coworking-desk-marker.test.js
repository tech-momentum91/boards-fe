import {
  coworkingInventoryTypesForApiFilter,
  isCoworkingDeskSeatSelectionType,
  isLayoutCoworkingDeskMarkerType,
  normalizeCoworkingInventoryType,
  resolveCoworkingInventoryTypeForApi,
} from '../layout-coworking-inventory-type.js';

describe('coworking desk marker inventory types', () => {
  it('normalizes legacy Flexi Desk to Hot Desk', () => {
    expect(normalizeCoworkingInventoryType('Flexi Desk')).toBe('Hot Desk');
    expect(normalizeCoworkingInventoryType('Hot Desk')).toBe('Hot Desk');
  });

  it('sends Hot Desk (not Flexi Desk) in create_space payload', () => {
    expect(resolveCoworkingInventoryTypeForApi('Hot Desk')).toBe('Hot Desk');
    expect(resolveCoworkingInventoryTypeForApi('Flexi Desk')).toBe('Hot Desk');
    expect(resolveCoworkingInventoryTypeForApi('Dedicated Desk')).toBe('Dedicated Desk');
  });

  it('recognizes desk-marker coworking types', () => {
    expect(isLayoutCoworkingDeskMarkerType('Hot Desk')).toBe(true);
    expect(isLayoutCoworkingDeskMarkerType('Flexi Desk')).toBe(true);
    expect(isLayoutCoworkingDeskMarkerType('Private Cabin')).toBe(false);
  });

  it('recognizes coworking types that require seat selection', () => {
    expect(isCoworkingDeskSeatSelectionType('Hot Desk')).toBe(true);
    expect(isCoworkingDeskSeatSelectionType('Flexi Desk')).toBe(true);
    expect(isCoworkingDeskSeatSelectionType('Dedicated Desk')).toBe(true);
    expect(isCoworkingDeskSeatSelectionType('Private Cabin')).toBe(false);
  });

  it('includes legacy Flexi Desk when filtering Hot Desk spaces', () => {
    expect(coworkingInventoryTypesForApiFilter('Hot Desk')).toEqual(['Hot Desk', 'Flexi Desk']);
    expect(coworkingInventoryTypesForApiFilter('Dedicated Desk')).toEqual(['Dedicated Desk']);
  });
});
