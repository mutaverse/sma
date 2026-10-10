import type { MomoTransactionType } from '@/constants/catalog';

const FIFTY_CEDIS_PESEWAS = 5_000;
const HALF_CEDI_PESEWAS = 50;
const ONE_THOUSAND_CEDIS_PESEWAS = 100_000;

export function calculateMomoCommission(
  transactionType: MomoTransactionType,
  amountPesewas: number,
): number {
  if (!Number.isInteger(amountPesewas) || amountPesewas <= 0) {
    throw new Error('Enter an amount greater than zero.');
  }

  if (transactionType === 'airtime') {
    return roundedPercent(amountPesewas, 10);
  }

  if (transactionType === 'cash_in') {
    if (amountPesewas >= ONE_THOUSAND_CEDIS_PESEWAS) {
      return roundedPercent(amountPesewas, 1);
    }

    const band = Math.ceil(amountPesewas / FIFTY_CEDIS_PESEWAS);
    return band * HALF_CEDI_PESEWAS;
  }

  if (amountPesewas <= FIFTY_CEDIS_PESEWAS) {
    return roundedPercent(HALF_CEDI_PESEWAS, 40);
  }

  const providerCharge = roundedPercent(amountPesewas, 1);
  return roundedPercent(providerCharge, 40);
}

function roundedPercent(amountPesewas: number, percent: number): number {
  return Math.round((amountPesewas * percent) / 100);
}
