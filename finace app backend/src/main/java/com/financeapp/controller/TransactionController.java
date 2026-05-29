package com.financeapp.controller;

import com.financeapp.dto.ApiResponse;
import com.financeapp.dto.TransactionRequest;
import com.financeapp.dto.TransactionResponse;
import com.financeapp.service.OcrService;
import com.financeapp.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final OcrService ocrService;

    // ✅ ADD TRANSACTION
    @PostMapping
    public ResponseEntity<ApiResponse<TransactionResponse>> addTransaction(
            @Valid @RequestBody TransactionRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        TransactionResponse data = transactionService.addTransaction(request, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Transaction added successfully"));
    }

    // ✅ OCR RECEIPT SCANNER
    @PostMapping("/ocr")
    public ResponseEntity<ApiResponse<TransactionResponse>> uploadReceiptOcr(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        TransactionResponse data = ocrService.processReceipt(file);
        return ResponseEntity.ok(ApiResponse.success(data, "Receipt scanned successfully"));
    }

    // ✅ GET USER TRANSACTIONS
    @GetMapping
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getTransactions(
            Authentication authentication) {
        String email = authentication.getName();
        List<TransactionResponse> data = transactionService.getUserTransactions(email);
        return ResponseEntity.ok(ApiResponse.success(data, "Transactions retrieved"));
    }

    // ✅ CLEAR TRANSACTIONS (For testing/reset)
    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse<String>> clearTransactions(Authentication authentication) {
        String email = authentication.getName();
        transactionService.clearTransactions(email);
        return ResponseEntity.ok(ApiResponse.success("Success", "All transactions cleared."));
    }

    // ✅ UPDATE TRANSACTION
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<TransactionResponse>> updateTransaction(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> updates,
            Authentication authentication) {
        String email = authentication.getName();
        String newNote = updates.get("note");
        if (newNote == null) {
            newNote = "";
        }
        TransactionResponse data = transactionService.updateTransaction(id, newNote, email);
        return ResponseEntity.ok(ApiResponse.success(data, "Transaction updated successfully"));
    }
}