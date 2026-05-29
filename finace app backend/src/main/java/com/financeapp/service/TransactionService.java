package com.financeapp.service;

import com.financeapp.dto.TransactionRequest;
import com.financeapp.dto.TransactionResponse;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import com.financeapp.util.CategoryUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

        private final TransactionRepository transactionRepository;
        private final UserRepository userRepository;

        // ✅ ADD TRANSACTION
        public TransactionResponse addTransaction(TransactionRequest request, String email) {

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                Transaction transaction = Transaction.builder()
                                .title(request.getTitle())
                                .amount(request.getAmount())
                                .category(
                                                request.getCategory() != null
                                                                ? request.getCategory()
                                                                : CategoryUtil.categorize(request.getTitle()))
                                .date(request.getDate())
                                .user(user)
                                .build();

                Transaction saved = transactionRepository.save(java.util.Objects.requireNonNull(transaction));

                return mapToResponse(saved);
        }

        // ✅ GET USER TRANSACTIONS
        public List<TransactionResponse> getUserTransactions(String email) {

                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                return transactionRepository.findByUserOrderByDateDesc(user)
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        // ✅ CLEAR USER TRANSACTIONS
        @org.springframework.transaction.annotation.Transactional
        public void clearTransactions(String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                transactionRepository.deleteByUser(user);
        }

        // ✅ UPDATE TRANSACTION (Title/Note)
        public TransactionResponse updateTransaction(Long id, String note, String email) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new RuntimeException("User not found"));
                
                Transaction transaction = transactionRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Transaction not found"));

                if (!transaction.getUser().getId().equals(user.getId())) {
                        throw new RuntimeException("Unauthorized");
                }

                transaction.setNote(note);
                Transaction updated = transactionRepository.save(transaction);
                return mapToResponse(updated);
        }

        // 🔁 MAPPER
        private TransactionResponse mapToResponse(Transaction transaction) {
                return TransactionResponse.builder()
                                .id(transaction.getId())
                                .title(transaction.getTitle())
                                .amount(transaction.getAmount())
                                .category(transaction.getCategory())
                                .date(transaction.getDate())
                                .note(transaction.getNote())
                                .build();
        }
}