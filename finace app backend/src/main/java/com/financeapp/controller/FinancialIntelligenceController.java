package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import com.financeapp.service.MlServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/intelligence")
public class FinancialIntelligenceController {

    @Autowired
    private MlServiceClient mlServiceClient;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/allocation")
    public ResponseEntity<ApiResponse> getDynamicAllocation() {
        User user = getCurrentUser();
        List<Transaction> transactions = transactionRepository.findByUser(user);
        
        double monthlyIncome = transactions.stream()
                .filter(t -> t.getAmount() > 0 && t.getDate().isAfter(LocalDate.now().minusDays(30)))
                .mapToDouble(Transaction::getAmount).sum();
                
        if (monthlyIncome == 0) {
            monthlyIncome = 50000; // Fallback for demo purposes
        }

        double currentSavings = transactions.stream().mapToDouble(Transaction::getAmount).sum();
        
        List<Map<String, Object>> txData = transactions.stream()
                .filter(t -> t.getDate().isAfter(LocalDate.now().minusDays(30)))
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("amount", Math.abs(t.getAmount()));
                    map.put("category", t.getCategory());
                    map.put("date", t.getDate().toString());
                    map.put("is_expense", t.getAmount() < 0);
                    return map;
                }).collect(Collectors.toList());

        Map<String, Object> request = new HashMap<>();
        request.put("monthly_income", monthlyIncome);
        request.put("current_savings", Math.max(0, currentSavings));
        request.put("debt_ratio", 0.2); // Placeholder, ideally calculated
        request.put("risk_profile", "medium");
        request.put("recent_transactions", txData);

        Map<String, Object> response = mlServiceClient.predictAllocation(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Dynamic allocation generated"));
    }

    @GetMapping("/behavior")
    public ResponseEntity<ApiResponse> getBehaviorInsights() {
        User user = getCurrentUser();
        List<Transaction> transactions = transactionRepository.findByUser(user);
        
        List<Map<String, Object>> txData = transactions.stream()
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("amount", Math.abs(t.getAmount()));
                    map.put("category", t.getCategory());
                    map.put("date", t.getDate().toString());
                    map.put("is_expense", t.getAmount() < 0); // Need to consider positive amounts based on data 
                    return map;
                }).collect(Collectors.toList());
                
        double monthlyIncome = transactions.stream()
                .filter(t -> t.getAmount() > 0)
                .mapToDouble(Transaction::getAmount).sum() / Math.max(1, transactions.stream().map(t -> t.getDate().getMonthValue()).distinct().count());

        Map<String, Object> request = new HashMap<>();
        request.put("transactions", txData);
        request.put("monthly_income", monthlyIncome > 0 ? monthlyIncome : 50000);

        Map<String, Object> response = mlServiceClient.analyzeBehavior(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Behavioral insights generated"));
    }
    
    @PostMapping("/goal-analysis")
    public ResponseEntity<ApiResponse> analyzeGoal(@RequestBody Map<String, Object> goalData) {
        User user = getCurrentUser();
        List<Transaction> transactions = transactionRepository.findByUser(user);
        
        double monthlyIncome = 50000;
        double monthlyExpenses = 30000;
        
        Map<String, Object> request = new HashMap<>();
        request.put("target_amount", Double.parseDouble(goalData.getOrDefault("targetAmount", "100000").toString()));
        request.put("current_saved", Double.parseDouble(goalData.getOrDefault("currentSaved", "0").toString()));
        request.put("timeline_months", Integer.parseInt(goalData.getOrDefault("timelineMonths", "12").toString()));
        request.put("monthly_income", monthlyIncome);
        request.put("monthly_expenses", monthlyExpenses);
        request.put("risk_profile", goalData.getOrDefault("riskProfile", "medium"));

        Map<String, Object> response = mlServiceClient.predictGoalSuccess(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Goal analysis generated"));
    }
}
