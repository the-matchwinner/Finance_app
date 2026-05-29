package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final com.financeapp.repository.UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(
            Authentication authentication) {
        String email = authentication.getName();
        Map<String, Object> monthly = dashboardService.getMonthlyReport(email);
        
        Map<String, Object> data = new java.util.HashMap<>(monthly);
        data.put("balance", dashboardService.getBalance(email));
        data.put("userName", userRepository.findByEmail(email).map(u -> u.getName()).orElse("User"));
        
        return ResponseEntity.ok(ApiResponse.success(data, "Dashboard data consolidated"));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<Map<String, Double>>> getCategoryBreakdown(
            Authentication authentication) {
        String email = authentication.getName();
        Map<String, Double> data = dashboardService.getCategoryBreakdown(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Category breakdown retrieved"));
    }

    @GetMapping("/monthly")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMonthlyReport(
            Authentication authentication) {
        String email = authentication.getName();
        Map<String, Object> data = dashboardService.getMonthlyReport(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Monthly report retrieved"));
    }

    @GetMapping("/range")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReportByRange(
            @RequestParam String start,
            @RequestParam String end,
            Authentication authentication) {
        String email = authentication.getName();
        Map<String, Object> data = dashboardService.getReportByDate(
                email,
                LocalDate.parse(start),
                LocalDate.parse(end));
        return ResponseEntity.ok(ApiResponse.success(data, "Range report retrieved"));
    }
}