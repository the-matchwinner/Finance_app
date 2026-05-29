package com.financeapp.dto;

import java.time.LocalDate;

public class TransactionResponse {

    private Long id;
    private String title;
    private Double amount;
    private String category;
    private LocalDate date;
    private String note;
    private boolean aiCategorized = true;

    public TransactionResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public boolean isAiCategorized() { return aiCategorized; }
    public void setAiCategorized(boolean aiCategorized) { this.aiCategorized = aiCategorized; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String title;
        private Double amount;
        private String category;
        private LocalDate date;
        private String note;
        private boolean aiCategorized = true;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder amount(Double amount) { this.amount = amount; return this; }
        public Builder category(String category) { this.category = category; return this; }
        public Builder date(LocalDate date) { this.date = date; return this; }
        public Builder note(String note) { this.note = note; return this; }
        public Builder aiCategorized(boolean aiCategorized) { this.aiCategorized = aiCategorized; return this; }

        public TransactionResponse build() {
            TransactionResponse r = new TransactionResponse();
            r.id = this.id;
            r.title = this.title;
            r.amount = this.amount;
            r.category = this.category;
            r.date = this.date;
            r.note = this.note;
            r.aiCategorized = this.aiCategorized;
            return r;
        }
    }
}