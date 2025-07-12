### Bank Account & Debt Management


1. **Debt Categorization:**

   - Classify **loan accounts** and **credit card accounts** as **"Debt"**.
   - When a **debt repayment transfer** is initiated, show **loan and credit card accounts as selectable targets**.

2. **Credit Card Expense Linking:**

   - Credit card usage should be recorded under **expenses**.
   - When a repayment is made toward a credit card:
     - When a repayment is made toward a credit card, check if the total repayment covers all the associated expenses for that month. If yes, update the corresponding **expense entries** with a **checkmark or status label** to indicate they are now **paid**.
     - make sure that it is not counted multiple times as expanse.

3. **Action Buttons:**

   - Create **separate buttons**:
     - One for **loan repayment**
     - One for **credit card repayment**

4. **Own Transfers (Non-Debt):**

   - Create a **separate transfer button** for **self-transfers**, like:
     - Saving → Cash account
     - Saving → Salary or Checking account

5. **Loan Management:**

   - Add a dedicated feature to **set up a new loan account** (when user borrows from someone or a bank).
   - Maintain a **record list** of **all loans taken historically**.
   - when a loan is replayed, delete that entry from the active accounts list but retain the historical record and its settlement status in a dedicated section—such as an 'Archived Loans' or 'Closed Loans' view—accessible from the loan management interface.

6. **Loan as Income Until Settled:**

   - When a loan is taken and deposited into any account (e.g., savings, cash), show this in the **Income section list view** as **"Loan Income"**.
   - Mark it with a **status tag** (e.g., *Settled / Not Settled*).

7. **Loan Repayment:**

   - When a loan repayment is made:
     - Log it as an **expense**.
     - Update the **"Loan Income"** record status to indicate if it's **settled**.

8. **International Transfers Enhancements:**

   - Add fields for:
     - **Transfer overhead cost** (flat or percentage)
     - **Currency exchange fee**
     - **Manual settlement adjustment field** (expects numeric input in the destination account's currency) to reconcile discrepancies between source and target accounts (due to forex or processing lags).

---

### Overview & Yearly Support

9. **Yearly Overview Bug Fix:**
   - When a user adds data for a new year (e.g., 2026), ensure the **Overview section** automatically includes the new year in its summary tabs or filters.

---

### Income Section Fixes

10. **Currency Symbol in Total:**

- Replace fixed `$` sign in "Total Income" with either:
  - The selected currency symbol
  - Or make it **currency-neutral**

11. **Show Credited Account:**

- In the **Income List View**, include a field to display the **credited account** (where income was deposited).

---

### Expense Section Fix

12. Apply the **same fixes as Income section**:

- Currency symbol should be flexible.
- Show the **account debited** for the expense in the list view.

---

**Note:**\
Do **not modify** any other unrelated parts of the app UI, logic, or structure. All changes should be implemented cleanly using appropriate component separation and view logic.
