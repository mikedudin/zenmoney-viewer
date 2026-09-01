import csv
import json

entries = []

with open('data.csv', mode='r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        date = row.get('date', '').strip()
        category = row.get('categoryName', '').strip()
        payee = row.get('payee', '').strip()
        comment = row.get('comment', '').strip()
        outcome_account = row.get('outcomeAccountName', '').strip()
        outcome_str = row.get('outcome', '0').strip()
        income_account = row.get('incomeAccountName', '').strip()
        income_str = row.get('income', '0').strip()

        if not date:
            continue

        try:
            outcome_val = float(outcome_str)
        except ValueError:
            outcome_val = 0.0

        try:
            income_val = float(income_str)
        except ValueError:
            income_val = 0.0

        # Skip entries without outcome
        if outcome_val <= 0:
            continue

        # Skip internal transfers where income == outcome and outcome_account == income_account
        if income_val > 0 and income_val == outcome_val and outcome_account == income_account:
            continue

        # Skip uncategorized entries
        if not category or category == "Без категории":
            continue

        entries.append({
            "date": date,
            "category": category,
            "payee": payee,
            "comment": comment,
            "amount": round(outcome_val, 2),
            "currency": row.get('outcomeCurrencyShortTitle', 'RUB').strip()
        })

with open('data.json', mode='w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)

print(f"Successfully converted {len(entries)} items to data.json")
