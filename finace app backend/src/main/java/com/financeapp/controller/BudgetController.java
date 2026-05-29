package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.dto.BudgetRequest;
import com.financeapp.dto.BudgetResponse;
import com.financeapp.service.BudgetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;

    // ✅ SET / UPDATE BUDGET
    @PostMapping
    public ResponseEntity<ApiResponse<BudgetResponse>> setBudget(
            @Valid @RequestBody BudgetRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        BudgetResponse data = budgetService.setBudget(request, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Budget saved successfully"));
    }

    // ✅ GET ALL BUDGETS
    @GetMapping
    public ResponseEntity<ApiResponse<List<BudgetResponse>>> getBudgets(
            Authentication authentication) {
        String email = authentication.getName();
        List<BudgetResponse> data = budgetService.getBudgets(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Budgets retrieved"));
    }
}
