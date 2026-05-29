package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.dto.GoalRequest;
import com.financeapp.model.Goal;
import com.financeapp.service.GoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    // ✅ CREATE GOAL
    @PostMapping
    public ResponseEntity<ApiResponse<Goal>> createGoal(
            @Valid @RequestBody GoalRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        Goal data = goalService.createGoal(request, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Goal created successfully"));
    }

    // ✅ GET ALL GOALS
    @GetMapping
    public ResponseEntity<ApiResponse<List<Goal>>> getGoals(Authentication authentication) {
        String email = authentication.getName();
        List<Goal> data = goalService.getGoals(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Goals retrieved"));
    }

    // ✅ UPDATE GOAL PROGRESS
    @PatchMapping("/{id}/progress")
    public ResponseEntity<ApiResponse<Goal>> updateProgress(
            @PathVariable Long id,
            @RequestParam Double amount,
            Authentication authentication) {
        String email = authentication.getName();
        Goal data = goalService.updateGoalProgress(id, amount, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Goal progress updated"));
    }

    // ✅ UPDATE GOAL
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Goal>> updateGoal(
            @PathVariable Long id,
            @Valid @RequestBody GoalRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        Goal data = goalService.updateGoal(id, request, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Goal updated successfully"));
    }

    // ✅ DELETE GOAL
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGoal(
            @PathVariable Long id,
            Authentication authentication) {
        String email = authentication.getName();
        goalService.deleteGoal(id, email);
        return ResponseEntity.ok(ApiResponse.success(null, "Goal deleted successfully"));
    }
}
