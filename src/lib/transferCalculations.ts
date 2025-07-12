interface TransferCalculationResult {
  destinationAmount: number;
  effectiveRate: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Calculates the final destination amount for an international money transfer with a fixed markup fee
 * 
 * @param sourceAmount - The amount to transfer in source currency (must be > 0)
 * @param baseExchangeRate - The base exchange rate (must be > 0)
 * @param fixedMarkupFee - The fixed markup fee in destination currency (must be >= 0 and <= baseExchangeRate)
 * @returns Object containing the destination amount, effective rate, and validation status
 */
export function calculateInternationalTransferAmount(
  sourceAmount: number,
  baseExchangeRate: number,
  fixedMarkupFee: number
): TransferCalculationResult {
  // Input validation
  if (typeof sourceAmount !== 'number' || typeof baseExchangeRate !== 'number' || typeof fixedMarkupFee !== 'number') {
    return {
      destinationAmount: 0,
      effectiveRate: 0,
      isValid: false,
      errorMessage: 'All inputs must be numeric values'
    };
  }

  if (sourceAmount <= 0) {
    return {
      destinationAmount: 0,
      effectiveRate: 0,
      isValid: false,
      errorMessage: 'Source amount must be greater than zero'
    };
  }

  if (baseExchangeRate <= 0) {
    return {
      destinationAmount: 0,
      effectiveRate: 0,
      isValid: false,
      errorMessage: 'Base exchange rate must be greater than zero'
    };
  }

  if (fixedMarkupFee < 0) {
    return {
      destinationAmount: 0,
      effectiveRate: 0,
      isValid: false,
      errorMessage: 'Fixed markup fee cannot be negative'
    };
  }

  if (fixedMarkupFee > baseExchangeRate) {
    return {
      destinationAmount: 0,
      effectiveRate: 0,
      isValid: false,
      errorMessage: 'Fixed markup fee cannot be greater than the base exchange rate'
    };
  }

  // Calculate effective exchange rate
  const effectiveRate = baseExchangeRate + fixedMarkupFee;

  // Calculate destination amount
  const destinationAmount = sourceAmount * effectiveRate;

  // Round to 2 decimal places
  const roundedDestinationAmount = Math.round(destinationAmount * 100) / 100;

  return {
    destinationAmount: roundedDestinationAmount,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000, // Round to 4 decimal places for rate
    isValid: true
  };
}

/**
 * Simplified version that calculates destination amount with basic validation
 * Throws errors for invalid inputs
 */
export function calculateDestinationAmount(
  sourceAmount: number,
  baseExchangeRate: number,
  fixedMarkupFee: number
): number {
  // Input validation
  if (sourceAmount <= 0 || baseExchangeRate <= 0 || fixedMarkupFee < 0) {
    throw new Error('Invalid input: All amounts must be positive, source amount must be > 0');
  }

  if (fixedMarkupFee > baseExchangeRate) {
    throw new Error('Fixed markup fee cannot exceed base exchange rate');
  }

  // Calculate effective rate and destination amount
  const effectiveRate = baseExchangeRate + fixedMarkupFee;
  const destinationAmount = sourceAmount * effectiveRate;

  // Return rounded to 2 decimal places
  return Math.round(destinationAmount * 100) / 100;
}

/**
 * Calculate comprehensive transfer breakdown including all fees
 */
export interface TransferBreakdown {
  sourceAmount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  baseExchangeRate: number;
  effectiveExchangeRate: number;
  convertedAmount: number;
  percentageMarkup: number;
  percentageMarkupAmount: number;
  fixedMarkupFee: number;
  extraFee: number;
  extraFeeCurrency: string;
  extraFeeConverted: number;
  bufferAmount: number;
  totalDestinationAmount: number;
  totalFees: number;
  isValid: boolean;
  errorMessage?: string;
}

export function calculateCompleteTransferBreakdown(
  sourceAmount: number,
  sourceCurrency: string,
  destinationCurrency: string,
  baseExchangeRate: number,
  percentageMarkup: number = 0,
  fixedMarkupFee: number = 0,
  extraFee: number = 0,
  extraFeeCurrency: string = '',
  bufferAmount: number = 0
): TransferBreakdown {
  // Input validation
  if (sourceAmount <= 0 || baseExchangeRate <= 0) {
    return {
      sourceAmount: 0,
      sourceCurrency,
      destinationCurrency,
      baseExchangeRate: 0,
      effectiveExchangeRate: 0,
      convertedAmount: 0,
      percentageMarkup: 0,
      percentageMarkupAmount: 0,
      fixedMarkupFee: 0,
      extraFee: 0,
      extraFeeCurrency,
      extraFeeConverted: 0,
      bufferAmount: 0,
      totalDestinationAmount: 0,
      totalFees: 0,
      isValid: false,
      errorMessage: 'Source amount and base exchange rate must be greater than zero'
    };
  }

  // Calculate base conversion
  const convertedAmount = sourceAmount * baseExchangeRate;

  // Calculate percentage markup
  const percentageMarkupAmount = convertedAmount * (percentageMarkup / 100);

  // Calculate effective exchange rate (base rate + fixed markup per unit)
  const effectiveExchangeRate = baseExchangeRate + (fixedMarkupFee / sourceAmount);

  // Convert extra fee to destination currency if needed
  let extraFeeConverted = extraFee;
  if (extraFeeCurrency === sourceCurrency && extraFee > 0) {
    extraFeeConverted = extraFee * baseExchangeRate;
  }

  // Calculate total destination amount
  const totalDestinationAmount = convertedAmount + percentageMarkupAmount + fixedMarkupFee + extraFeeConverted + bufferAmount;

  // Calculate total fees in destination currency
  const totalFees = percentageMarkupAmount + fixedMarkupFee + extraFeeConverted;

  return {
    sourceAmount: Math.round(sourceAmount * 100) / 100,
    sourceCurrency,
    destinationCurrency,
    baseExchangeRate: Math.round(baseExchangeRate * 10000) / 10000,
    effectiveExchangeRate: Math.round(effectiveExchangeRate * 10000) / 10000,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    percentageMarkup,
    percentageMarkupAmount: Math.round(percentageMarkupAmount * 100) / 100,
    fixedMarkupFee: Math.round(fixedMarkupFee * 100) / 100,
    extraFee: Math.round(extraFee * 100) / 100,
    extraFeeCurrency,
    extraFeeConverted: Math.round(extraFeeConverted * 100) / 100,
    bufferAmount: Math.round(bufferAmount * 100) / 100,
    totalDestinationAmount: Math.round(totalDestinationAmount * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    isValid: true
  };
}