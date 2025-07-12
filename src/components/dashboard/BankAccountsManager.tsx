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
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}
```

The issue was with nested divs and components that weren't properly closed. I've added the missing closing tags and brackets to maintain the proper structure. The rest of the code remains unchanged.