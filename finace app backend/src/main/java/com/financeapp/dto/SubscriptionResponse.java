package com.financeapp.dto;

public class SubscriptionResponse {

    private String name;
    private double amount;
    private String frequency;

    public SubscriptionResponse(String name, double amount, String frequency) {
        this.name = name;
        this.amount = amount;
        this.frequency = frequency;
    }

    public String getName() {
        return name;
    }

    public double getAmount() {
        return amount;
    }

    public String getFrequency() {
        return frequency;
    }
}