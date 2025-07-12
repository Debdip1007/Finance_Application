Here's the fixed script with the missing closing brackets and required whitespace:

```jsx
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Exchange Rate Markup (%)"
                type="number"
                value={internationalTransferForm.exchangeRateMarkup}
                onChange={(e) => setInternationalTransferForm({ ...internationalTransferForm, exchangeRateMarkup: e.target.value })}
                placeholder="0.00"
                step="0.01"
                helpText="Additional percentage markup over base rate (simulates bank fees)"
              />
            </div>
          </div>
```

I've added the missing closing brackets and proper indentation to fix the syntax error in the exchange rate calculation section. The rest of the file appears to be properly structured.