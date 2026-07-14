import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

function App() {
  const [expenses, setExpenses] = useState({ totalSpent: 0, transactions: [], live_incomes: [], message: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(7); 
  const [selectedYear, setSelectedYear] = useState(2026); 
  const [forecast, setForecast] = useState(null);
  const [annualSummary, setAnnualSummary] = useState({ income: 0, expenses: 0, net: 0 });
  
  const [linkToken, setLinkToken] = useState(null);
  const [isBankConnected, setIsBankConnected] = useState(false);

  
  useEffect(() => {
    const generateLinkToken = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/create_link_token', { method: 'POST' });
        const data = await res.json();
        if (data.link_token) {
          setLinkToken(data.link_token);
        }
      } catch (err) {
        console.error("Error creating link token:", err);
      }
    };
    generateLinkToken();
  }, []);

  const onSuccess = useCallback(async (public_token) => {
    try {
      const res = await fetch('http://localhost:8000/api/set_access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsBankConnected(true);
      }
    } catch (err) {
      console.error("Error exchanging public token:", err);
    }
  }, []);

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  }, []);

  
  const calculateAnnualSummary = useCallback(async (year) => {
    try {
      let totalYrIncome = 0;
      let totalYrExpenses = 0;
      
      
      for (let m = 1; m <= 12; m++) {
        const res = await fetch(`http://localhost:8000/api/forecast/${m}?year=${year}`);
        const data = await res.json();
        totalYrIncome += data.total_income || 0;
        totalYrExpenses += data.forecast?.total_estimated_expenses || 0;
      }
      
      setAnnualSummary({
        income: Math.round(totalYrIncome),
        expenses: Math.round(totalYrExpenses),
        net: Math.round(totalYrIncome - totalYrExpenses)
      });
    } catch (err) {
      console.error("Error calculating annual summary:", err);
    }
  }, []);

  useEffect(() => {
    if (!isBankConnected) return;

    const loadDashboardData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/forecast/${selectedMonth}?year=${selectedYear}`);
        const data = await res.json();
        setForecast(data);
      } catch (err) {
        console.error("Error fetching forecast:", err);
      }
      await fetchExpenses();
      await calculateAnnualSummary(selectedYear);
    };

    loadDashboardData();
  }, [selectedMonth, selectedYear, fetchExpenses, calculateAnnualSummary, isBankConnected]);

  const handleSync = async () => {
    setIsSyncing(true);
    await fetchExpenses(); 
    setTimeout(async () => {
      await fetchExpenses();
      await calculateAnnualSummary(selectedYear);
      setIsSyncing(false);
    }, 4500);
  };

  if (!isBankConnected && !linkToken) {
    return (
      <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: '500' }}>
          ⏳ Παρακαλώ περιμένετε, δημιουργία ασφαλούς περιβάλλοντος Plaid...
        </div>
      </div>
    );
  }

  if (!isBankConnected) {
    return (
      <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>🪙 Fintech Smart Dashboard</h2>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Συνδέστε τον Sandbox λογαριασμό σας για να αναλύσουμε τα έξοδα και τα έσοδά σας.</p>
          <button onClick={() => open()} disabled={!ready} style={{ backgroundColor: ready ? '#2563eb' : '#94a3b8', color: '#fff', border: 'none', padding: '14px 24px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: ready ? 'pointer' : 'not-allowed', width: '100%' }}>
            {ready ? '🔗 Σύνδεση με Τράπεζα' : '⏳ Προετοιμασία Widget...'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', padding: '30px', backgroundColor: '#f4f6f9', minHeight: '100vh', color: '#333' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b' }}>🪙 Fintech Smart Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Real-time Plaid Sandbox Integration & Pandas Engine</p>
        </div>
        <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>✓ Connected via Plaid</span>
      </header>

      {forecast && (
        <div style={{ backgroundColor: forecast.financial_health.net_balance > 0 ? '#dcfce7' : '#fee2e2', border: `1px solid ${forecast.financial_health.net_balance > 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '12px', padding: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: forecast.financial_health.net_balance > 0 ? '#166534' : '#991b1b' }}>
              Κατάσταση ({selectedMonth}/{selectedYear}): {forecast.financial_health.status}
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#475569' }}>Συνολικά Έσοδα Μήνα: <strong>€{forecast.total_income}</strong></p>
            {forecast.income_breakdown && forecast.income_breakdown.map((inc, index) => (
              <span key={index} style={{ fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', marginRight: '5px', marginTop: '5px', display: 'inline-block' }}>
                🎉 {inc.title}: +€{inc.amount}
              </span>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.2rem', color: '#475569' }}>Υπόλοιπο Μήνα:</span>
            <h2 style={{ margin: 0, fontSize: '2rem', color: forecast.financial_health.net_balance > 0 ? '#15803d' : '#b91c1c' }}>
              {forecast.financial_health.net_balance > 0 ? `+€${forecast.financial_health.net_balance}` : `-€${Math.abs(forecast.financial_health.net_balance)}`}
            </h2>
          </div>
        </div>
      )}

      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        
       
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📥 Live Συναλλαγές Τράπεζας</h3>
            <button onClick={handleSync} disabled={isSyncing} style={{ backgroundColor: isSyncing ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: isSyncing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isSyncing ? '⏳ Συγχρονισμός...' : '🔄 Sync Bank Data'}
            </button>
          </div>

          <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#1e293b', borderBottom: '2px solid #ef4444', paddingBottom: '5px' }}>
            💸 Σύνολο Εξόδων: <strong>€{expenses.totalSpent}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px', maxHeight: '220px', overflowY: 'auto' }}>
            {expenses.transactions && expenses.transactions.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Δεν βρέθηκαν έξοδα στη μνήμη. Πατήστε Sync.</p>
            ) : (
              expenses.transactions && expenses.transactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #f1f5f9', borderRadius: '8px', backgroundColor: '#fff5f5' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{tx.description}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tx.category} | {tx.date}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#e11d48' }}>-€{tx.amount}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#1e293b', borderBottom: '2px solid #10b981', paddingBottom: '5px' }}>
            💰 Live Καταθέσεις / Έσοδα:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {!expenses.live_incomes || expenses.live_incomes.length === 0 ? (
              <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>Δεν βρέθηκαν έσοδα στη μνήμη. Πατήστε Sync.</p>
            ) : (
              expenses.live_incomes.map((inc) => (
                <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#14532d' }}>{inc.description}</div>
                    <div style={{ fontSize: '0.8rem', color: '#15803d' }}>{inc.category} | {inc.date}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#16a34a' }}>+€{inc.amount}</div>
                </div>
              ))
            )}
          </div>
        </div>

        
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>📊 Έξυπνη Πρόβλεψη (Pandas Engine)</h3>
            
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}>
                <option value={1}>Ιανουάριος</option>
                <option value={2}>Φεβρουάριος</option>
                <option value={3}>Μάρτιος</option>
                <option value={4}>Απρίλιος</option>
                <option value={5}>Μάιος</option>
                <option value={6}>Ιούνιος</option>
                <option value={7}>Ιούλιος</option>
                <option value={8}>Αύγουστος</option>
                <option value={9}>Σεπτέμβριος</option>
                <option value={10}>Οκτώβριος</option>
                <option value={11}>Νοέμβριος</option>
                <option value={12}>Δεκέμβριος</option>
              </select>

              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))} 
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 'bold' }}>
                {/* Δημιουργεί αυτόματα επιλογές από το 2026 (φετινό) έως και 10 χρόνια πίσω (2016) */}
                {Array.from({ length: 11 }, (_, i) => 2026 - i).map((year) => (
                <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {forecast && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                  <span>Βασικά Μηνιαία Έξοδα (+/- Διακύμανση):</span>
                  <strong>€{forecast.forecast.base_monthly_expenses}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                  <span>Έκτακτα Γεγονότα Μήνα:</span>
                  <strong style={{ color: forecast.forecast.special_events_expenses > 0 ? '#b91c1c' : '#334155' }}>+€{forecast.forecast.special_events_expenses}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', paddingTop: '5px' }}>
                  <span>Συνολική Εκτίμηση Μήνα:</span>
                  <span style={{ color: '#1e293b' }}>€{forecast.forecast.total_estimated_expenses}</span>
                </div>
              </div>

              <h4>📅 Προγραμματισμένα Γεγονότα Μήνα</h4>
              {forecast.special_events_breakdown.length === 0 ? (
                <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>Κανένα έκτακτο έξοδο για αυτόν τον μήνα.</p>
              ) : (
                forecast.special_events_breakdown.map((event, idx) => (
                  <div key={idx} style={{ padding: '10px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#c2410c', fontWeight: '500' }}>⚠️ {event.title}</span>
                    <strong style={{ color: '#c2410c' }}>€{event.amount}</strong>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          🔥 ΝΕΟ SECTION: ΕΤΗΣΙΟΣ ΑΠΟΛΟΓΙΣΜΟΣ (ANNUAL SUMMARY)
          ========================================== */}
      <div style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #475569', paddingBottom: '15px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>📊 Συνολικός Απολογισμός Έτους {selectedYear} (Pandas Historical Analysis)</h3>
          <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>Ετήσιο Cumulative Report</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center' }}>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>💰 Συνολικά Έσοδα Έτους</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#10b981', fontSize: '2.2rem' }}>€{annualSummary.income.toLocaleString()}</h2>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>💸 Συνολικά Έξοδα Έτους</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#f43f5e', fontSize: '2.2rem' }}>€{annualSummary.expenses.toLocaleString()}</h2>
          </div>
          <div>
            <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>📈 Καθαρό Κέρδος / Αποταμίευση</span>
            <h2 style={{ margin: '5px 0 0 0', color: annualSummary.net > 0 ? '#34d399' : '#f87171', fontSize: '2.2rem' }}>
              {annualSummary.net > 0 ? `+€${annualSummary.net.toLocaleString()}` : `-€${Math.abs(annualSummary.net).toLocaleString()}`}
            </h2>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;