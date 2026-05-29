package com.financeapp.dto;

public class BudgetResponse {

    private String category;
    private Double limitAmount;
    private Double spent;
    private Double remaining;

    public BudgetResponse() {}

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getLimitAmount() { return limitAmount; }
    public void setLimitAmount(Double limitAmount) { this.limitAmount = limitAmount; }

    public Double getSpent() { return spent; }
    public void setSpent(Double spent) { this.spent = spent; }

    public Double getRemaining() { return remaining; }
    public void setRemaining(Double remaining) { this.remaining = remaining; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String category;
        private Double limitAmount;
        private Double spent;
        private Double remaining;

        public Builder category(String category) { this.category = category; return this; }
        public Builder limitAmount(Double limitAmount) { this.limitAmount = limitAmount; return this; }
        public Builder spent(Double spent) { this.spent = spent; return this; }
        public Builder remaining(Double remaining) { this.remaining = remaining; return this; }

        public BudgetResponse build() {
            BudgetResponse r = new BudgetResponse();
            r.category = this.category;
            r.limitAmount = this.limitAmount;
            r.spent = this.spent;
            r.remaining = this.remaining;
            return r;
        }
    }
}