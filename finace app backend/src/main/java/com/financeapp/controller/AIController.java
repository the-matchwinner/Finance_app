package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {

    private final AIService aiService;

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> askAI(@RequestBody Map<String, String> request) {
        String prompt = request.get("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Prompt is required", 400));
        }
        
        try {
            String response = aiService.askAI(prompt);
            return ResponseEntity.ok(ApiResponse.success(response, "AI response generated"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to generate AI response. Make sure API key is configured.", 500));
        }
    }
}
