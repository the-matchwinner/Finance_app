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
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Transaction t WHERE t.user = :user")
    void deleteByUser(@org.springframework.data.repository.query.Param("user") User user);

}
