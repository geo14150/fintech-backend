// Εδώ αποθηκεύουμε τα δεδομένα μας στη μνήμη RAM (In-Memory Database)
const db = {
    users: [
        { id: "user_1", name: "Giorgos Paulos" }
    ],
    bankAccounts: [
        // Εδώ θα αποθηκευτεί το Access Token όταν συνδεθεί η τράπεζα
        // Παράδειγμα: { userId: "user_1", accessToken: "access-sandbox-xxx", institutionName: "National Bank of Greece" }
    ],
    transactions: [
        // Εδώ θα αποθηκεύονται τα έξοδα που "τραβάμε" από την τράπεζα
    ],
    // Εδώ ορίζουμε τους μέσους όρους και τις προβλέψεις 
    predictions: [
        { category: "Supermarket", monthlyAverage: 250 },
        { category: "Electricity", monthlyAverage: 80 },
        { category: "Gym", monthlyAverage: 30 }
    ],
    // Εδώ βάζουμε τα σταθερά γεγονότα (π.χ. Τέλη κυκλοφορίας)
    scheduledEvents: [
        { id: "1", title: "Τέλη Κυκλοφορίας", month: 2, amount: 120 }, // 2 = Φλεβάρης
        { id: "2", title: "Ασφάλεια Αυτοκινήτου", month: 5, amount: 200 }, // 5 = Μάιος
        { id: "3", title: "Δώρα Γενεθλίων", month: 3, amount: 50 } // 3 = Μάρτιος
    ]
};

module.exports = db;