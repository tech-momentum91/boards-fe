import { z } from 'zod';

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? undefined : numberValue;
};

export const stockAddProductSchema = z.object({
  item_name: z.string().trim().min(1, 'Product title is required'),
  item_group: z.string().min(1, 'Category is required'),
  stock_uom: z.string().min(1, 'Unit is required'),
  brand: z.string().trim().min(1, 'Brand name is required'),
  disabled: z.number().default(0),
  custom_type: z.string().min(1, 'Type is required'),
  custom_oem: z.string().trim().optional(),
  description: z.string().optional(),
  market_price: z.preprocess(
    toNumber,
    z
      .number({ invalid_type_error: 'Market price is required' })
      .positive('Market price should be greater than 0'),
  ),
  purchase_price: z.preprocess(
    toNumber,
    z
      .number({ invalid_type_error: 'Purchase price is required' })
      .positive('Purchase price should be greater than 0'),
  ),
  /** Local `File` objects; uploaded before create → `custom_product_images` on API payload. */
  imageFiles: z.array(z.any()).max(10).optional().default([]),
});

export const defaultStockAddProductValues = {
  item_name: '',
  item_group: '',
  stock_uom: '',
  brand: '',
  disabled: 0,
  custom_type: '',
  custom_oem: '',
  description: '',
  market_price: '',
  purchase_price: '',
  imageFiles: [],
};
