package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.service.SetuService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/banks/setu")
@RequiredArgsConstructor
public class SetuController {

    private final SetuService setuService;

    @PostMapping("/consent")
    public ResponseEntity<ApiResponse<Map<String, String>>> createSetuConsent(Authentication authentication) {
        String email = authentication.getName();
        Map<String, String> consentData = setuService.createConsent(email);
        return ResponseEntity.ok(ApiResponse.success(consentData, "Setu consent request generated successfully"));
    }

    @PostMapping("/callback")
    public ResponseEntity<ApiResponse<String>> handleSetuCallback(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String email = authentication.getName();
        String consentId = body.get("consentId");
        if (consentId == null || consentId.trim().isEmpty()) {
            throw new RuntimeException("Consent ID is required.");
        }
        String syncResult = setuService.syncData(consentId.trim(), email);
        return ResponseEntity.ok(ApiResponse.success(syncResult, "Account Aggregator data synced successfully"));
    }
}
