package com.financeapp.service;

import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final TransactionRepository transactionRepository;
        private final UserRepository userRepository;
//      private final AIService aiService;

        public double getTotalIncome(String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return transactionRepository.findByUser(user).stream()
                                .filter(t -> t.getAmount() > 0)
                                .mapToDouble(Transaction::getAmount)
                                .sum();
        }

        public double getTotalExpense(String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return transactionsToExpense(transactionRepository.findByUser(user));
        }

        private double transactionsToExpense(List<Transaction> transactions) {
                return transactions.stream()
                                .filter(t -> t.getAmount() < 0)
                                .mapToDouble(t -> Math.abs(t.getAmount()))
                                .sum();
        }

        public double getBalance(String email) {
                return getTotalIncome(email) - getTotalExpense(email);
        }

        public Map<String, Double> getCategoryBreakdown(String email) {

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Transaction> transactions = transactionRepository.findByUser(user);

                return transactions.stream()
                                .filter(t -> t.getAmount() < 0) // only expenses
                                .collect(Collectors.groupingBy(
                                                Transaction::getCategory,
                                                Collectors.summingDouble(t -> Math.abs(t.getAmount()))));
        }

        public Map<String, Object> getMonthlyReport(String email) {

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Transaction> transactions = transactionRepository.findByUser(user);

                double income = transactions.stream()
                                .filter(t -> t.getAmount() > 0)
                                .mapToDouble(Transaction::getAmount)
                                .sum();

                double expense = transactions.stream()
                                .filter(t -> t.getAmount() < 0)
                                .mapToDouble(t -> Math.abs(t.getAmount()))
                                .sum();

                Map<String, Double> categoryMap = transactions.stream()
                                .filter(t -> t.getAmount() < 0)
                                .collect(Collectors.groupingBy(
                                                Transaction::getCategory,
                                                Collectors.summingDouble(t -> Math.abs(t.getAmount()))));

                String topCategory = categoryMap.entrySet().stream()
                                .max(Map.Entry.comparingByValue())
                                .map(Map.Entry::getKey)
                                .orElse("None");

                // Get last 6 months trends based on the latest transaction date
                LocalDate latestDate = transactions.stream()
                        .map(Transaction::getDate)
                        .max(LocalDate::compareTo)
                        .orElse(LocalDate.now());
                LocalDate now = latestDate.withDayOfMonth(1);

                Map<String, Double> trends = new java.util.LinkedHashMap<>();
                for (int i = 5; i >= 0; i--) {
                        LocalDate monthStart = now.minusMonths(i);
                        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                        double monthExpense = transactions.stream()
                                        .filter(t -> t.getAmount() < 0 && !t.getDate().isBefore(monthStart) && !t.getDate().isAfter(monthEnd))
                                        .mapToDouble(t -> Math.abs(t.getAmount()))
                                        .sum();
                        trends.put(monthStart.getMonth().toString().substring(0, 3) + " '" + String.format("%02d", monthStart.getYear() % 100), monthExpense);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("totalIncome", income);
                response.put("totalExpense", expense);
                response.put("balance", income - expense);
                response.put("topCategory", topCategory);
                response.put("categoryBreakdown", categoryMap);
                response.put("trends", trends);

                return response;
        }

//      public String getAIInsight(String email, String question) {
//
//              Map<String, Object> report = getMonthlyReport(email);
//
//              String context = "User financial data: " + report.toString();
//
//              return aiService.askAI(context + ". Question: " + question);
//      }

        public Map<String, Object> getReportByDate(
                        String email,
                        LocalDate start,
                        LocalDate end) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                List<Transaction> transactions = transactionRepository.findByUserAndDateBetween(user, start, end);

                double income = transactions.stream()
                                .filter(t -> t.getAmount() > 0)
                                .mapToDouble(Transaction::getAmount)
                                .sum();

                double expense = transactions.stream()
                                .filter(t -> t.getAmount() < 0)
                                .mapToDouble(t -> Math.abs(t.getAmount()))
                                .sum();

                Map<String, Double> categoryMap = transactions.stream()
                                .filter(t -> t.getAmount() < 0)
                                .collect(Collectors.groupingBy(
                                                Transaction::getCategory,
                                                Collectors.summingDouble(t -> Math.abs(t.getAmount()))));

                Map<String, Object> response = new HashMap<>();
                response.put("income", income);
                response.put("expense", expense);
                response.put("categories", categoryMap);

                return response;
        }
}
