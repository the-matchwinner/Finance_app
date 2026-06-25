package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.service.AIService;
import com.financeapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;
    private final DashboardService dashboardService;

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> askAI(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        String prompt = request.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Prompt is required", 400));
        }
        
        try {
            Map<String, Object> financialData = null;
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                financialData = dashboardService.getMonthlyReport(email);
            }
            String response = aiService.askAI(prompt, financialData);
            return ResponseEntity.ok(ApiResponse.success(response, "AI response generated"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to generate AI response: " + e.getMessage(), 500));
        }
    }
}
