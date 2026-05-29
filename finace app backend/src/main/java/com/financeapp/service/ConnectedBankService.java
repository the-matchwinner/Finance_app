package com.financeapp.service;

import com.financeapp.model.ConnectedBank;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.ConnectedBankRepository;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class ConnectedBankService {

    private final ConnectedBankRepository connectedBankRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public List<ConnectedBank> getConnectedBanks(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return connectedBankRepository.findByUser(user);
    }

    @Transactional
    public ConnectedBank connectBank(String bankName, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (connectedBankRepository.existsByUserAndBankName(user, bankName)) {
            throw new RuntimeException("This institution is already connected.");
        }

        String accountName;
        String accountNumber;
        switch (bankName.toLowerCase()) {
            // Indian Banks
            case "sbi":
                accountName = "SBI Savings Account";
                accountNumber = "**** 4092";
                break;
            case "hdfc":
                accountName = "HDFC Regular Savings";
                accountNumber = "**** 1102";
                break;
            case "icici":
                accountName = "ICICI Privilege Account";
                accountNumber = "**** 8840";
                break;
            case "citibank":
                accountName = "Citi Suvidha Account";
                accountNumber = "**** 6732";
                break;
            case "axis":
                accountName = "Axis Easy Access Account";
                accountNumber = "**** 2294";
                break;
            // UPI Apps
            case "gpay":
                accountName = "Google Pay UPI Link";
                accountNumber = "gpay@upi";
                break;
            case "paytm":
                accountName = "Paytm Wallet / UPI";
                accountNumber = "paytm@paytm";
                break;
            case "phonepe":
                accountName = "PhonePe UPI Link";
                accountNumber = "phonepe@ybl";
                break;
            case "bhim":
                accountName = "BHIM UPI App";
                accountNumber = "bhim@upi";
                break;
            default:
                accountName = bankName.toUpperCase() + " Account";
                accountNumber = "**** " + (int)(Math.random() * 9000 + 1000);
        }

        ConnectedBank connection = ConnectedBank.builder()
                .bankName(bankName)
                .accountName(accountName)
                .accountNumber(accountNumber)
                .status("Active Sync")
                .lastSync(LocalDate.now())
                .user(user)
                .build();

        ConnectedBank savedConnection = connectedBankRepository.save(connection);

        // Populate with rich mock transactions
        generateRichMockTransactions(user, bankName);

        return savedConnection;
    }

    @Transactional
    public void disconnectBank(Long id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ConnectedBank connection = connectedBankRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Connection not found"));

        if (!connection.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        // Delete mock transactions created by this specific bank connection
        List<Transaction> userTransactions = transactionRepository.findByUser(user);
        List<Transaction> toDelete = new ArrayList<>();
        String tag = "Simulated bank transaction for " + connection.getBankName();
        for (Transaction t : userTransactions) {
            if (tag.equals(t.getNote())) {
                toDelete.add(t);
            }
        }
        transactionRepository.deleteAll(toDelete);

        // Delete the bank connection record itself
        connectedBankRepository.delete(connection);
    }

    private void generateRichMockTransactions(User user, String bankName) {
        LocalDate today = LocalDate.now();
        List<Transaction> mockTxs = new ArrayList<>();
        String tag = "Simulated bank transaction for " + bankName;
        Random rand = new Random();

        // 1. Generate regular Monthly transactions (Salary, Rent, Subscriptions)
        // We will seed these for the last 3 months
        for (int m = 0; m < 3; m++) {
            LocalDate monthDate = today.minusMonths(m);
            LocalDate salaryDate = LocalDate.of(monthDate.getYear(), monthDate.getMonth(), 1);
            LocalDate rentDate = LocalDate.of(monthDate.getYear(), monthDate.getMonth(), 5);

            switch (bankName.toLowerCase()) {
                case "sbi":
                    mockTxs.add(buildTx("Salary - Govt of India / Corp", 78000.00, "Income", salaryDate, tag, user));
                    mockTxs.add(buildTx("Rent Payment - Landlord", -24000.00, "Rent", rentDate, tag, user));
                    break;
                case "hdfc":
                    mockTxs.add(buildTx("Salary Credit - Tech India", 125000.00, "Income", salaryDate, tag, user));
                    mockTxs.add(buildTx("Rent Transfer - HDFC NetBanking", -28000.00, "Rent", rentDate, tag, user));
                    break;
                case "icici":
                    mockTxs.add(buildTx("Salary Credit - Infosys Ltd", 98000.00, "Income", salaryDate, tag, user));
                    mockTxs.add(buildTx("Monthly Rent - MyGate", -22000.00, "Rent", rentDate, tag, user));
                    break;
                case "citibank":
                    mockTxs.add(buildTx("Salary - MNC India Corp", 185000.00, "Income", salaryDate, tag, user));
                    mockTxs.add(buildTx("Rent - Citibank BillPay", -35000.00, "Rent", rentDate, tag, user));
                    mockTxs.add(buildTx("Netflix India Premium", -649.00, "Entertainment", salaryDate.plusDays(10), tag, user));
                    mockTxs.add(buildTx("Adobe Creative Cloud", -2399.00, "Software", salaryDate.plusDays(15), tag, user));
                    break;
                case "axis":
                    mockTxs.add(buildTx("Monthly Salary - TCS", 68000.00, "Income", salaryDate, tag, user));
                    mockTxs.add(buildTx("Apartment Rent - Owner", -18000.00, "Rent", rentDate, tag, user));
                    break;
            }
        }

        // 2. Generate 30 randomized transactions distributed over the last 90 days
        int numRandomTx = 30;
        for (int i = 0; i < numRandomTx; i++) {
            // Pick a random day in the last 90 days
            int dayOffset = rand.nextInt(90);
            LocalDate date = today.minusDays(dayOffset);

            String title;
            double amount;
            String category;

            switch (bankName.toLowerCase()) {
                case "sbi":
                    String[] sbiMerchants = {"Reliance Smart", "BigBasket", "DMart", "Tata Power Electricity", "Airtel Broadband", "Indane Gas", "Saravana Bhavan", "Haldiram's", "Indian Oil Petrol", "Fastag Recharge"};
                    String[] sbiCats = {"Groceries", "Groceries", "Groceries", "Utilities", "Utilities", "Utilities", "Food & Dining", "Food & Dining", "Travel", "Travel"};
                    int sbiIdx = rand.nextInt(sbiMerchants.length);
                    title = sbiMerchants[sbiIdx];
                    category = sbiCats[sbiIdx];
                    amount = generateAmountForCategory(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "hdfc":
                    String[] hdfcMerchants = {"Nature's Basket", "Swiggy Instamart", "Zepto", "Amazon India", "Flipkart", "Myntra", "Dominos Pizza", "Starbucks India", "Ola Cabs", "Uber Ride"};
                    String[] hdfcCats = {"Groceries", "Groceries", "Groceries", "Shopping", "Shopping", "Shopping", "Food & Dining", "Food & Dining", "Travel", "Travel"};
                    int hdfcIdx = rand.nextInt(hdfcMerchants.length);
                    title = hdfcMerchants[hdfcIdx];
                    category = hdfcCats[hdfcIdx];
                    amount = generateAmountForCategory(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "icici":
                    String[] iciciMerchants = {"Flipkart Internet", "Decathlon India", "Croma Electronics", "Mutual Fund - Groww SIP", "Zomato Dineout", "Swiggy Food", "MakeMyTrip Flight", "MakeMyTrip Hotel"};
                    String[] iciciCats = {"Shopping", "Shopping", "Shopping", "Investment", "Food & Dining", "Food & Dining", "Travel", "Travel"};
                    int iciciIdx = rand.nextInt(iciciMerchants.length);
                    title = iciciMerchants[iciciIdx];
                    category = iciciCats[iciciIdx];
                    amount = generateAmountForCategory(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "citibank":
                    String[] citiMerchants = {"The Taj Palace", "Social Offline", "Sly Granny", "Apple Store Mumbai", "Zara India", "IKEA Bangalore", "Spotify Premium", "Airtel Postpaid"};
                    String[] citiCats = {"Food & Dining", "Food & Dining", "Food & Dining", "Shopping", "Shopping", "Shopping", "Entertainment", "Utilities"};
                    int citiIdx = rand.nextInt(citiMerchants.length);
                    title = citiMerchants[citiIdx];
                    category = citiCats[citiIdx];
                    amount = generateAmountForCategory(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "axis":
                    String[] axisMerchants = {"BigBasket Grocery", "Local Supermarket", "HP Petrol Pump", "Bharat Petroleum", "Zomato Delivery", "Pizza Hut", "Uber India", "Metro Smartcard"};
                    String[] axisCats = {"Groceries", "Groceries", "Travel", "Travel", "Food & Dining", "Food & Dining", "Travel", "Travel"};
                    int axisIdx = rand.nextInt(axisMerchants.length);
                    title = axisMerchants[axisIdx];
                    category = axisCats[axisIdx];
                    amount = generateAmountForCategory(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "gpay":
                    String[] gpayMerchants = {"GPay @ Chai Tapri", "GPay @ Local Bakery", "GPay @ Mother Dairy", "GPay @ Local Kirana", "GPay @ Auto Rickshaw", "GPay @ Parking Fare", "GPay Received from Friend"};
                    String[] gpayCats = {"Food & Dining", "Food & Dining", "Groceries", "Groceries", "Travel", "Travel", "Income"};
                    int gpayIdx = rand.nextInt(gpayMerchants.length);
                    title = gpayMerchants[gpayIdx];
                    category = gpayCats[gpayIdx];
                    amount = "Income".equals(category) ? (1000.00 + rand.nextInt(4000)) : -generateUpiAmount(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "paytm":
                    String[] paytmMerchants = {"Paytm Wallet Add Money", "Paytm Fastag Auto-Recharge", "Paytm QR - Kirana Shop", "Paytm QR - Vegetable Vendor", "Paytm QR - Tea stall"};
                    String[] paytmCats = {"Other", "Travel", "Groceries", "Groceries", "Food & Dining"};
                    int paytmIdx = rand.nextInt(paytmMerchants.length);
                    title = paytmMerchants[paytmIdx];
                    category = paytmCats[paytmIdx];
                    amount = -generateUpiAmount(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "phonepe":
                    String[] ppeMerchants = {"PhonePe Recharge Jio", "PhonePe Hotstar Subscription", "PhonePe Swiggy Order", "PhonePe Zomato Order", "PhonePe Transfer to Friend", "PhonePe Received from Dad"};
                    String[] ppeCats = {"Utilities", "Entertainment", "Food & Dining", "Food & Dining", "Other", "Income"};
                    int ppeIdx = rand.nextInt(ppeMerchants.length);
                    title = ppeMerchants[ppeIdx];
                    category = ppeCats[ppeIdx];
                    amount = "Income".equals(category) ? (2000.00 + rand.nextInt(3000)) : -generateUpiAmount(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                case "bhim":
                    String[] bhimMerchants = {"BHIM UPI Peer Transfer", "BHIM UPI Received - Reimbursement", "BHIM Govt Tax Payment", "BHIM Electricity Bill"};
                    String[] bhimCats = {"Other", "Income", "Other", "Utilities"};
                    int bhimIdx = rand.nextInt(bhimMerchants.length);
                    title = bhimMerchants[bhimIdx];
                    category = bhimCats[bhimIdx];
                    amount = "Income".equals(category) ? (1200.00 + rand.nextInt(3500)) : -generateUpiAmount(category, rand);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;

                default:
                    title = "Simulated merchant txn";
                    category = "Other";
                    amount = -150.00 - rand.nextInt(2000);
                    mockTxs.add(buildTx(title, amount, category, date, tag, user));
                    break;
            }
        }

        // Save generated transactions
        transactionRepository.saveAll(mockTxs);
    }

    private Transaction buildTx(String title, double amount, String category, LocalDate date, String tag, User user) {
        return Transaction.builder()
                .title(title)
                .amount(amount)
                .category(category)
                .date(date)
                .note(tag)
                .user(user)
                .build();
    }

    private double generateAmountForCategory(String category, Random rand) {
        switch (category) {
            case "Groceries":
                return -(350.00 + rand.nextInt(4000));
            case "Utilities":
                return -(400.00 + rand.nextInt(3000));
            case "Food & Dining":
                return -(150.00 + rand.nextInt(3500));
            case "Shopping":
                return -(800.00 + rand.nextInt(15000));
            case "Travel":
                return -(120.00 + rand.nextInt(8000));
            case "Investment":
                return -(5000.00 + rand.nextInt(10000));
            case "Rent":
                return -20000.00;
            default:
                return -(100.00 + rand.nextInt(2500));
        }
    }

    private double generateUpiAmount(String category, Random rand) {
        switch (category) {
            case "Food & Dining":
                return 15.00 + rand.nextInt(300); // Small tea tapri to restaurants
            case "Groceries":
                return 50.00 + rand.nextInt(1200); // Local kirana
            case "Travel":
                return 30.00 + rand.nextInt(600);  // Autos, rickshaws, cabs
            case "Utilities":
                return 200.00 + rand.nextInt(1000); // Mobile recharge
            case "Entertainment":
                return 299.00 + rand.nextInt(800);  // Subscriptions
            default:
                return 100.00 + rand.nextInt(1500); // Peer transfers
        }
    }
}
