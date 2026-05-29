package com.financeapp.dto;

public class AlertResponse {

    private String category;
    private Double spent;
    private Double limitAmount;
    private Double percentage;
    private String status;

    public AlertResponse() {}

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getSpent() { return spent; }
    public void setSpent(Double spent) { this.spent = spent; }

    public Double getLimitAmount() { return limitAmount; }
    public void setLimitAmount(Double limitAmount) { this.limitAmount = limitAmount; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String category;
        private Double spent;
        private Double limitAmount;
        private Double percentage;
        private String status;

        public Builder category(String category) { this.category = category; return this; }
        public Builder spent(Double spent) { this.spent = spent; return this; }
        public Builder limitAmount(Double limitAmount) { this.limitAmount = limitAmount; return this; }
        public Builder percentage(Double percentage) { this.percentage = percentage; return this; }
        public Builder status(String status) { this.status = status; return this; }

        public AlertResponse build() {
            AlertResponse r = new AlertResponse();
            r.category = this.category;
            r.spent = this.spent;
            r.limitAmount = this.limitAmount;
            r.percentage = this.percentage;
            r.status = this.status;
            return r;
        }
    }
}
