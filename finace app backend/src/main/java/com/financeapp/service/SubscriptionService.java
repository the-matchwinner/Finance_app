package com.financeapp.service;

import com.financeapp.dto.SubscriptionResponse;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public SubscriptionService(TransactionRepository transactionRepository,
                               UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    public List<SubscriptionResponse> getSubscriptions(String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Transaction> transactions = transactionRepository.findByUser(user);

        Map<String, List<Transaction>> grouped = transactions.stream()
                .filter(t -> t.getAmount() < 0)
                .collect(Collectors.groupingBy(t -> t.getTitle() + "_" + t.getAmount()));

        List<SubscriptionResponse> result = new ArrayList<>();

        for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {

            List<Transaction> list = entry.getValue();

            if (list.size() >= 2) {
                Transaction t = list.get(0);

                result.add(new SubscriptionResponse(
                        t.getTitle(),
                        Math.abs(t.getAmount()),
                        "MONTHLY"
                ));
            }
        }

        return result;
    }
}
