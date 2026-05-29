package com.financeapp.repository;

import com.financeapp.model.ConnectedBank;
import com.financeapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectedBankRepository extends JpaRepository<ConnectedBank, Long> {
    List<ConnectedBank> findByUser(User user);
    Optional<ConnectedBank> findByUserAndBankName(User user, String bankName);
    boolean existsByUserAndBankName(User user, String bankName);
}
