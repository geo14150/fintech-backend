import pandas as pd
import numpy as np

def calculate_monthly_forecast(month: int, year: int, transactions: list):
    """
    Υπολογίζει δυναμικά ιστορικά δεδομένα με Pandas, διασφαλίζοντας 
    οικονομική ισορροπία (εναλλαγή πλεονάσματος/ελλείμματος).
    """
    if not transactions:
        return {
            "total_income": 0,
            "forecast": {"base_monthly_expenses": 0, "special_events_expenses": 0, "total_estimated_expenses": 0},
            "special_events_breakdown": [],
            "financial_health": {"status": "No Data", "net_balance": 0},
            "income_breakdown": []
        }
    
    df = pd.DataFrame(transactions)
    
    # 1. Υπολογισμός και Ενίσχυση Μισθού (Income) για υγιή βάση δεδομένων
    raw_income = df[df['type'] == 'income']['amount'].sum()
    if raw_income == 0:
        raw_income = 1800.00  # Αυξάνουμε ελαφρώς τη βάση για να αποφύγουμε μόνιμο έλλειμμα
    else:
        raw_income = max(raw_income, 1800.00) # Διασφάλιση ελάχιστης βάσης εσόδων
        
    # Seed για μοναδικά δεδομένα ανά συνδυασμό μήνα/έτους
    np.random.seed(month * year)
    
    # 3% μείωση μισθού ανά έτος όσο πάμε στο παρελθόν
    years_back = 2026 - year
    historical_factor = (0.97) ** years_back
    base_salary = round(raw_income * historical_factor, 2)
    
    special_income_sources = []
    income_multiplier = 1.0
    
    # Μηνιαία Έκτακτα Έσοδα
    if month == 4:
        income_multiplier = 1.4
        special_income_sources.append({"title": "Δώρο Πάσχα", "amount": round(base_salary * 0.4, 2)})
    elif month == 12:
        income_multiplier = 1.8
        special_income_sources.append({"title": "Δώρο Χριστουγέννων", "amount": round(base_salary * 0.8, 2)})
    elif month == 3:
        income_multiplier = 1.15
        special_income_sources.append({"title": "Performance Bonus", "amount": round(base_salary * 0.15, 2)})
        
    total_income = round(base_salary * income_multiplier, 2)
    
    # 2. Υπολογισμός και Εξορθολογισμός Εξόδων
    raw_expenses = df[df['type'] == 'expense']['amount'].sum()
    
    # Αν τα έξοδα της Plaid είναι υπερβολικά μεγάλα ή μηδενικά, τα θέτουμε σε μια λογική βάση (π.χ. ~950€)
    if raw_expenses == 0 or raw_expenses > raw_income:
        base_raw_expenses = 950.00
    else:
        base_raw_expenses = raw_expenses
        
    # Τα έξοδα μειώνονται επίσης στο παρελθόν (4.5% ανά έτος)
    expense_historical_factor = (0.955) ** years_back
    
    # Ήπια τυχαία διακύμανση ±12% (για να μην έχουμε ακραία σκαμπανεβάσματα που προκαλούν έλλειμμα)
    fluctuation = np.random.uniform(-0.12, 0.12)
    base_expenses = round(base_raw_expenses * expense_historical_factor * (1 + fluctuation), 2)
    
    # 3. Μηνιαία Έκτακτα Έξοδα (Πιο ρεαλιστικά ποσά)
    special_events = []
    if month == 8:
        special_events.append({"title": "Έξοδα Διακοπών & Ξενοδοχεία", "amount": round(400.00 * expense_historical_factor, 2)})
    elif month in [5, 11]:
        special_events.append({"title": "Ασφάλεια Αυτοκινήτου", "amount": round(150.00 * expense_historical_factor, 2)})
    elif month == 6:
        special_events.append({"title": "Οδοντίατρος / Ιατρικά", "amount": round(80.00 * expense_historical_factor, 2)})
    elif month == 1:
        special_events.append({"title": "Δώρα & Εορταστικά Τραπέζια", "amount": round(120.00 * expense_historical_factor, 2)})
        
    special_events_total = sum(event["amount"] for event in special_events)
    total_estimated_expenses = round(base_expenses + special_events_total, 2)
    
    # 4. Υπολογισμός Καθαρής Κατάστασης (Net Balance)
    net_balance = round(total_income - total_estimated_expenses, 2)
    
    # Κατηγοριοποίηση οικονομικής υγείας
    if net_balance > 400:
        status = "🟢 Εξαιρετική (Πλεόνασμα)"
    elif net_balance >= 100:
        status = "🟢 Καλή (Σταθερότητα)"
    elif net_balance >= 0:
        status = "🟡 Οριακή (Ισοσκελισμένος)"
    else:
        status = "🔴 Προσοχή (Έλλειμμα)"
        
    return {
        "total_income": total_income,
        "income_breakdown": special_income_sources,
        "forecast": {
            "base_monthly_expenses": base_expenses,
            "special_events_expenses": special_events_total,
            "total_estimated_expenses": total_estimated_expenses
        },
        "special_events_breakdown": special_events,
        "financial_health": {
            "status": status,
            "net_balance": net_balance
        }
    }