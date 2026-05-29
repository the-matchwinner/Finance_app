package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.dto.AlertResponse;
import com.financeapp.service.BudgetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final BudgetService budgetService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getAlerts(
            Authentication authentication) {
        String email = authentication.getName();
        List<AlertResponse> data = budgetService.getAlerts(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Alerts retrieved"));
    }
}