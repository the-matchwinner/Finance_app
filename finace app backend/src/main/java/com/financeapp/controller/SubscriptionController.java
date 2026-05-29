package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.dto.SubscriptionResponse;
import com.financeapp.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubscriptionResponse>>> getSubscriptions(
            Authentication authentication) {
        String email = authentication.getName();
        List<SubscriptionResponse> data = subscriptionService.getSubscriptions(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Subscriptions retrieved"));
    }
}
