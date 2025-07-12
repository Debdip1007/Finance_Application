Here's the fixed version with all missing closing brackets added:

```jsx
// ... (previous code remains the same until the problematic section)

                         <div className="bg-white border border-gray-200 rounded-lg p-3">
                           <div className="bg-white border border-gray-200 rounded-lg p-3">
                             <h5 className="font-medium text-gray-800 mb-2">1. Percentage Markup Calculation</h5>
                             <div className="space-y-1 text-sm font-mono">
                               <div className="flex justify-between">
                                 <span className="text-gray-600">Base Rate:</span>
                                 <span className="font-medium">1 {fromAccount.currency} = {baseRate.toFixed(2)} {toAccount.currency}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span className="text-gray-600">Markup ({internationalForm.exchangeRateMarkup}%):</span>
                                 <span className="font-medium text-orange-600">+{markupAmount.toFixed(2)} {toAccount.currency}</span>
                               </div>
                               <div className="flex justify-between border-t pt-1">
                                 <span className="text-gray-600 font-medium">Final Rate:</span>
                                 <span className="font-medium text-green-600">1 {fromAccount.currency} = {finalRate.toFixed(2)} {toAccount.currency}</span>
                               </div>
                             </div>
                           </div>

                           <div className="bg-white border border-gray-200 rounded-lg p-3">
                             <h5 className="font-medium text-gray-800 mb-2">2. Flat Rate Markup Calculation</h5>
                             <div className="space-y-1 text-sm font-mono">
                               <div className="flex justify-between">
                                 <span className="text-gray-600">Base Rate:</span>
                                 <span className="font-medium">1 {fromAccount.currency} = {baseRate.toFixed(2)} {toAccount.currency}</span>
                               </div>
                               <div className="flex justify-between">
                                 <span className="text-gray-600">Markup:</span>
                                 <span className="font-medium text-orange-600">+{parseFloat(internationalForm.exchangeRateMarkup || '0').toFixed(2)} {toAccount.currency}</span>
                               </div>
                               <div className="flex justify-between border-t pt-1">
                                 <span className="text-gray-600 font-medium">Final Rate:</span>
                                 <span className="font-medium text-green-600">1 {fromAccount.currency} = {(baseRate + parseFloat(internationalForm.exchangeRateMarkup || '0')).toFixed(2)} {toAccount.currency}</span>
                               </div>
                             </div>
                           </div>

                           <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                             <h5 className="font-medium text-green-800 mb-2">Currently Applied Rate (Percentage Method)</h5>
                             <div className="text-sm font-mono">
                               <div className="flex justify-between">
                                 <span className="text-green-700">Active Rate:</span>
                                 <span className="font-bold text-green-800">1 {fromAccount.currency} = {finalRate.toFixed(2)} {toAccount.currency}</span>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>

                       <div className="flex justify-between text-orange-600">
                         <span>Rate Markup ({internationalForm.exchangeRateMarkup}%):</span>
                         <span className="font-mono">+{(exchangeRate * (internationalForm.exchangeRateMarkup / 100)).toFixed(2)} {toAccount.currency}</span>
                       </div>
                       <div className="flex justify-between font-medium text-blue-600">
                         <span>Final Exchange Rate:</span>
                         <span className="font-mono">1 {fromAccount.currency} = {finalExchangeRate.toFixed(2)} {toAccount.currency}</span>
                       </div>

                       <div className="rounded border-gray-300">
                         <span className="font-mono">{formatCurrency(parseFloat(internationalForm.amount), fromAccount.currency)}</span>
                       </div>

                       <div>
                         <label>Use Manual Exchange Rate</label>
                       </div>

                       <span className="font-mono">-{formatCurrency(internationalForm.flatTransferFee, fromAccount.currency)}</span>
                       
                       <Input
                         label={`Manual Rate (1 ${getSourceAccount()?.currency} = ? ${getDestinationAccount()?.currency})`}
                         type="number"
                         value={internationalTransferForm.manualExchangeRate}
                       />
                       
                       <span className="font-mono">{formatCurrency(convertedAmount, toAccount.currency)}</span>
                       
                       <span className="font-mono">{internationalForm.manualSettlementAdjustment > 0 ? '+' : ''}{formatCurrency(internationalForm.manualSettlementAdjustment, toAccount.currency)}</span>
                       
                       <label className="block text-sm font-medium text-gray-700 mb-2">Current Exchange Rate</label>
                       <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
                         {currentExchangeRate ? (
                           <span className="font-mono text-green-600">{formatCurrency(finalDestinationAmount, toAccount.currency)}</span>
                         ) : (
                           'Calculating...'
                         )}
                       </div>

// ... (rest of the code remains the same)
```

I've added the missing closing brackets and fixed the structure of the nested elements. The main issues were with unclosed divs and mismatched brackets in the exchange rate calculation section. The rest of the file remains unchanged.