package com.financeapp.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.Objects;

@Entity
@Table(name = "connected_banks")
public class ConnectedBank {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String bankName;

    @Column(nullable = false)
    private String accountName;

    @Column(nullable = false)
    private String accountNumber;

    @Column(nullable = false)
    private String status;

    private LocalDate lastSync;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public ConnectedBank() {}

    public ConnectedBank(Long id, String bankName, String accountName, String accountNumber, String status, LocalDate lastSync, User user) {
        this.id = id;
        this.bankName = bankName;
        this.accountName = accountName;
        this.accountNumber = accountNumber;
        this.status = status;
        this.lastSync = lastSync;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getLastSync() { return lastSync; }
    public void setLastSync(LocalDate lastSync) { this.lastSync = lastSync; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String bankName;
        private String accountName;
        private String accountNumber;
        private String status;
        private LocalDate lastSync;
        private User user;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder bankName(String bankName) { this.bankName = bankName; return this; }
        public Builder accountName(String accountName) { this.accountName = accountName; return this; }
        public Builder accountNumber(String accountNumber) { this.accountNumber = accountNumber; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder lastSync(LocalDate lastSync) { this.lastSync = lastSync; return this; }
        public Builder user(User user) { this.user = user; return this; }

        public ConnectedBank build() {
            return new ConnectedBank(id, bankName, accountName, accountNumber, status, lastSync, user);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ConnectedBank that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
