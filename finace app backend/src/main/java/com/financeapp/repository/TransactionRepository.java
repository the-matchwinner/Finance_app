package com.financeapp.repository;

import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUser(User user);
    List<Transaction> findByUserOrderByDateDesc(User user);
    List<Transaction> findByUserAndDateBetween(User user, LocalDate start, LocalDate end);
    boolean existsByUserAndTitleAndAmountAndDate(User user, String title, Double amount, LocalDate date);
    void deleteByUser(User user);
}
