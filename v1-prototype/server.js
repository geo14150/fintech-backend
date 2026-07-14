const express = require('express');
const cors = require('cors');
const db = require('./database');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Για να καταλαβαίνει το API μας JSON δεδομένα

const PORT = process.env.PORT || 3000;

// ==========================================
// 1. ENDPOINT: Επιστρέφει ΑΜΕΣΩΣ τα έξοδα από τη δική μας βάση
// ==========================================
app.get('/api/expenses', (req, res) => {
    console.log("📥 Λήφθηκε αίτημα για έξοδα. Απαντάμε ακαριαία από τη δική μας DB...");
    
    // 1. Παίρνουμε τα έξοδα από τη "βάση" μας
    const savedTransactions = db.transactions;
    
    // 2. Υπολογίζουμε το σύνολο
    const totalSpent = savedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 3. Στέλνουμε την απάντηση στον χρήστη αμέσως (<10ms)
    res.json({
        success: true,
        totalTransactionsCount: savedTransactions.length,
        totalSpent: totalSpent,
        transactions: savedTransactions,
        message: "Data loaded from local cache."
    });

    // 🔥 ΕΔΩ ΕΙΝΑΙ ΤΟ ENGINEERING TRICK:
    // Αφού απαντήσαμε στον χρήστη, ξεκινάμε ΑΣΥΓΧΡΟΝΑ (στο background) 
    // να μιλήσουμε με την "αργή τράπεζα" για να ανανεώσουμε τα δεδομένα για την επόμενη φορά.
    triggerBackgroundBankSync();
});

// ==========================================
// 2. BACKGROUND WORKER (Προσομοίωση καθυστέρησης τράπεζας)
// ==========================================
function triggerBackgroundBankSync() {
    console.log("⏳ [Background Worker] Ξεκίνησε ο συγχρονισμός με την τράπεζα στο παρασκήνιο...");

    // Προσομοιώνουμε ότι η τράπεζα κάνει 4 δευτερόλεπτα να απαντήσει (setTimeout)
    setTimeout(() => {
        console.log("🏦 [Background Worker] Η τράπεζα απάντησε μετά από 4 δευτερόλεπτα!");
        
        // Ψεύτικα δεδομένα (Mock Data) που υποτίθεται ήρθαν από το Plaid Sandbox
        const newTransactionsFromBank = [
            { id: "tx_1", description: "Σούπερ Μάρκετ Σκλαβενίτης", amount: 45.50, category: "Supermarket", date: "2026-06-15" },
            { id: "tx_2", description: "ΕΚΟ Βενζίνη", amount: 20.00, category: "Transport", date: "2026-06-16" },
            { id: "tx_3", description: "Netflix Subscription", amount: 10.99, category: "Entertainment", date: "2026-06-17" }
        ];

        // Κάνουμε "Sync" στη δική μας βάση (προσθέτουμε μόνο όσα δεν έχουμε)
        newTransactionsFromBank.forEach(bankTx => {
            const exists = db.transactions.some(localTx => localTx.id === bankTx.id);
            if (!exists) {
                db.transactions.push(bankTx);
                console.log(`✅ Προστέθηκε νέο έξοδο: ${bankTx.description} - €${bankTx.amount}`);
            }
        });

        console.log("💾 [Background Worker] Η τοπική DB ενημερώθηκε σιωπηλά!");
    }, 4000); // 4000 milliseconds = 4 δευτερόλεπτα
}

// Εκκίνηση του Server
app.listen(PORT, () => {
    console.log(`🚀 Ο διακομιστής τρέχει στη διεύθυνση: http://localhost:${PORT}`);
});