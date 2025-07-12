/**
 * Calculates the final destination amount for an international money transfer,
 * where a fixed markup fee is added directly to the base exchange rate.
 *
 * @param sourceAmount The amount to be transferred in the source currency. Must be a positive number.
 * @param baseExchangeRate The base exchange rate (e.g., 1 unit of source currency buys X units of destination currency). Must be a positive number.
 * @param fixedMarkupFee The fixed fee added to the exchange rate, in terms of destination currency per unit of source currency. Must be a non-negative number.
 * @returns The calculated destination amount, rounded to 2 decimal places.
 * @throws Error if any input validation fails.
 */
export function calculateInternationalTransferAmountWithMarkup(
  sourceAmount: number,
  baseExchangeRate: number,
  fixedMarkupFee: number
): number {
  // Input validation
  if (typeof sourceAmount !== 'number' || sourceAmount <= 0) {
    throw new Error('Source amount must be a positive number.');
  }
  if (typeof baseExchangeRate !== 'number' || baseExchangeRate <= 0) {
    throw new Error('Base exchange rate must be a positive number.');
  }
  if (typeof fixedMarkupFee !== 'number' || fixedMarkupFee < 0) {
    throw new Error('Fixed markup fee must be a non-negative number.');
  }

  // Validate that markup fee is not greater than base rate
  if (fixedMarkupFee > baseExchangeRate) {
    throw new Error('Fixed markup fee cannot be greater than the base exchange rate.');
  }

  // Calculate the new effective exchange rate
  const newExchangeRate = baseExchangeRate + fixedMarkupFee;

  // Compute the final destination amount
  const destinationAmount = sourceAmount * newExchangeRate;

  // Return the destination amount rounded to 2 decimal places
  return Math.round(destinationAmount * 100) / 100;
}

/**
 * Gets the effective exchange rate after adding markup fee
 */
export function getEffectiveExchangeRate(
  baseExchangeRate: number,
  fixedMarkupFee: number
): number {
  if (typeof baseExchangeRate !== 'number' || baseExchangeRate <= 0) {
    throw new Error('Base exchange rate must be a positive number.');
  }
  if (typeof fixedMarkupFee !== 'number' || fixedMarkupFee < 0) {
    throw new Error('Fixed markup fee must be a non-negative number.');
  }

  return baseExchangeRate + fixedMarkupFee;
}