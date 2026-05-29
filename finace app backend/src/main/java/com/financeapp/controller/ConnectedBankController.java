package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.model.ConnectedBank;
import com.financeapp.service.ConnectedBankService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/banks")
@RequiredArgsConstructor
public class ConnectedBankController {

    private final ConnectedBankService connectedBankService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConnectedBank>>> getConnectedBanks(Authentication authentication) {
        String email = authentication.getName();
        List<ConnectedBank> data = connectedBankService.getConnectedBanks(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Connected banks retrieved successfully"));
    }

    @PostMapping("/connect")
    public ResponseEntity<ApiResponse<ConnectedBank>> connectBank(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String email = authentication.getName();
        String bankName = body.get("bankName");
        if (bankName == null || bankName.trim().isEmpty()) {
            throw new RuntimeException("Bank name is required.");
        }
        ConnectedBank data = connectedBankService.connectBank(bankName.trim(), email);
        return ResponseEntity.ok(ApiResponse.success(data, "Bank account connected successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> disconnectBank(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        connectedBankService.disconnectBank(id, email);
        return ResponseEntity.ok(ApiResponse.success("Success", "Bank account disconnected successfully"));
    }
}
