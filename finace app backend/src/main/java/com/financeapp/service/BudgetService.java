package com.financeapp.service;

import com.financeapp.dto.AlertResponse;
import com.financeapp.dto.BudgetRequest;
import com.financeapp.dto.BudgetResponse;
import com.financeapp.model.Budget;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.BudgetRepository;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    // ✅ SET OR UPDATE BUDGET
    public BudgetResponse setBudget(BudgetRequest request, String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Budget budget = budgetRepository
                .findByUserAndCategory(user, request.getCategory())
                .orElse(new Budget());

        budget.setCategory(request.getCategory());
        budget.setLimitAmount(request.getLimitAmount());
        budget.setUser(user);

        Budget saved = budgetRepository.save(budget);

        double spent = calculateSpent(user, request.getCategory());

        return BudgetResponse.builder()
                .category(saved.getCategory())
                .limitAmount(saved.getLimitAmount())
                .spent(spent)
                .remaining(saved.getLimitAmount() - spent)
                .build();
    }

    // ✅ GET ALL BUDGETS WITH STATUS
    public List<BudgetResponse> getBudgets(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Budget> budgets = budgetRepository.findByUser(user);

        return budgets.stream().map(budget -> {

            double spent = calculateSpent(user, budget.getCategory());

            return BudgetResponse.builder()
                    .category(budget.getCategory())
                    .limitAmount(budget.getLimitAmount())
                    .spent(spent)
                    .remaining(budget.getLimitAmount() - spent)
                    .build();
        }).toList();
    }

    // ✅ GET ALERTS FOR BUDGET THRESHOLDS
    public List<AlertResponse> getAlerts(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Budget> budgets = budgetRepository.findByUser(user);

        return budgets.stream().map(budget -> {

            double spent = calculateSpent(user, budget.getCategory());
            double limit = budget.getLimitAmount();

            double percentage = (spent / limit) * 100;

            String status;

            if (percentage >= 100) {
                status = "EXCEEDED";
            } else if (percentage >= 80) {
                status = "WARNING";
            } else {
                status = "SAFE";
            }

            return AlertResponse.builder()
                    .category(budget.getCategory())
                    .spent(spent)
                    .limitAmount(limit)
                    .percentage(percentage)
                    .status(status)
                    .build();

        }).toList();
    }

    // 🔁 CALCULATE SPENT
    private double calculateSpent(User user, String category) {

        List<Transaction> transactions = transactionRepository.findByUser(user);

        return transactions.stream()
                .filter(t -> t.getCategory().equalsIgnoreCase(category))
                .filter(t -> t.getAmount() < 0)
                .mapToDouble(t -> Math.abs(t.getAmount()))
                .sum();
    }
}