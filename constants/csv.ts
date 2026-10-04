import { PRODUCT_UNITS } from '@/constants/catalog';

export const CSV_COLUMNS = [
  'name',
  'unit',
  'category',
  'selling_price',
  'cost_price',
  'on_hand',
] as const;

export const CSV_TEMPLATE = `name,unit,category,selling_price,cost_price,on_hand
Milo 400g,pack,Food,28.00,23.50,24
Milo 1kg,pack,Food,61.00,50.00,12
`;

export const CSV_UNITS_HINT = PRODUCT_UNITS.join(', ');
