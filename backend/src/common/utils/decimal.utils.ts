import { Decimal } from 'decimal.js';

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function sumDecimals(values: (Decimal | null | undefined)[]): Decimal {
  return values.reduce(
    (acc, val) => (val ? acc.add(val) : acc),
    new Decimal(0),
  );
}

export function decimalToNumber(value: Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}
