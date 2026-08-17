import {
  normalizeProjectPaymentRegisterRow,
  normalizeProjectPaymentRegisterRows,
  normalizeCreatePaymentSheetVendors,
  buildCreateProjectPaymentSheetPayload,
} from './project-procurements-utils';

describe('normalizeProjectPaymentRegisterRow', () => {
  it('maps API fields to table row shape', () => {
    expect(
      normalizeProjectPaymentRegisterRow({
        purchase_order: 'PO-1',
        po_no: 'PO-1',
        vendor: 'SUP-1',
        vendor_name: 'Gulf Electric',
        package: 'PKG-1',
        category: 'Electric Works',
        po_value: 100000,
        paid_amount: 40000,
        pending_amount: 60000,
        status: 'Partially paid',
        created_at: '2026-06-01',
      }),
    ).toEqual({
      id: 'PO-1',
      purchase_order: 'PO-1',
      po_no: 'PO-1',
      vendor: 'Gulf Electric',
      vendor_id: 'SUP-1',
      package: 'PKG-1',
      category: 'Electric Works',
      po_value: 100000,
      paid_amt: 40000,
      pending_amt: 60000,
      status: 'Partially paid',
      created_at: '2026-06-01',
    });
  });
});

describe('normalizeProjectPaymentRegisterRows', () => {
  it('normalizes an array', () => {
    expect(
      normalizeProjectPaymentRegisterRows([{ purchase_order: 'PO-1', vendor_name: 'A' }]),
    ).toHaveLength(1);
  });
});

describe('normalizeCreatePaymentSheetVendors', () => {
  it('keeps vendor id and display name for drawer rows', () => {
    const vendors = normalizeCreatePaymentSheetVendors([
      {
        id: 'SUP-1',
        vendor: 'SUP-1',
        vendor_name: 'Gulf Electric',
        po_value: 10,
        paid_amt: 0,
        pending_amt: 10,
        pos: [
          {
            id: 'PO-1',
            purchase_order: 'PO-1',
            po_no: 'PO-1',
            package: 'PKG',
            category: 'Electric Works',
            po_value: 10,
            paid_amt: 0,
            pending_amt: 10,
            due_as_per_terms: 5,
            due_terms_pct: 50,
            suggested_payment: 5,
            design_end: '',
            milestone_end: '',
          },
        ],
      },
    ]);
    expect(vendors[0].id).toBe('SUP-1');
    expect(vendors[0].vendor_name).toBe('Gulf Electric');
    expect(vendors[0].pos[0].purchase_order).toBe('PO-1');
  });
});

describe('buildCreateProjectPaymentSheetPayload', () => {
  it('builds items only for POs with a requested amount', () => {
    const payload = buildCreateProjectPaymentSheetPayload({
      sheetName: 'July Week 1',
      projectId: 'PROJ-0002',
      masterSheet: 'MPS-1',
      expectedPaymentDate: '2026-07-20',
      remarks: 'note',
      status: 'Draft',
      vendors: [
        {
          id: 'SUP-1',
          vendor: 'SUP-1',
          pos: [
            {
              id: 'PO-1',
              purchase_order: 'PO-1',
              po_no: 'PO-1',
              package: 'PKG',
              category: 'Electric Works',
              po_value: 100,
              due_as_per_terms: 50,
              due_terms_pct: 50,
              design_end: '2026-08-01',
              milestone_end: '2026-09-01',
            },
          ],
        },
      ],
      poAmounts: { 'PO-1': '25' },
      poPercents: { 'PO-1': '25' },
    });

    expect(payload).toEqual({
      sheet_name: 'July Week 1',
      project: 'PROJ-0002',
      master_payment_sheet: 'MPS-1',
      expected_payment_date: '2026-07-20',
      remarks: 'note',
      status: 'Draft',
      items: [
        {
          vendor: 'SUP-1',
          purchase_order: 'PO-1',
          po_no: 'PO-1',
          package: 'PKG',
          category: 'Electric Works',
          po_value: 100,
          due_as_per_terms: 50,
          due_terms_pct: 50,
          requested_amount: 25,
          requested_pct: 25,
          design_end: '2026-08-01',
          milestone_end: '2026-09-01',
        },
      ],
    });
  });
});
