package com.financeapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class AIService {

    private final WebClient webClient;
    private final String apiKey;

    public AIService(@Value("${gemini.api.key:}") String apiKey) {
        this.apiKey = apiKey;
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public String askAI(String prompt) {
        return askAI(prompt, null);
    }

    public String askAI(String prompt, Map<String, Object> financialData) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("placeholder")) {
            return "Simulated response (Gemini API key is not configured): Please configure a valid Gemini API key in the GEMINI_API_KEY environment variable. Based on your prompt: '" + prompt + "', I recommend maintaining a 20% savings rate and reviewing your recent expenses to optimize your budget.";
        }

        // Build full prompt with financial context if available
        StringBuilder fullPrompt = new StringBuilder();
        if (financialData != null && !financialData.isEmpty()) {
            fullPrompt.append("User's Real-time Financial Data:\n");
            fullPrompt.append("- Total Income: ").append(financialData.getOrDefault("totalIncome", 0.0)).append("\n");
            fullPrompt.append("- Total Expense: ").append(financialData.getOrDefault("totalExpense", 0.0)).append("\n");
            fullPrompt.append("- Balance: ").append(financialData.getOrDefault("balance", 0.0)).append("\n");
            fullPrompt.append("- Top Spending Category: ").append(financialData.getOrDefault("topCategory", "None")).append("\n");
            fullPrompt.append("- Category Breakdown: ").append(financialData.getOrDefault("categoryBreakdown", "{}")).append("\n");
            fullPrompt.append("- Last 6 Months Trends: ").append(financialData.getOrDefault("trends", "{}")).append("\n\n");
        }
        fullPrompt.append("User Query: ").append(prompt);

        // System instructions (Guardrails) to restrict AI to financial-only questions
        Map<String, Object> systemInstruction = Map.of(
                "parts", List.of(Map.of("text", "You are a professional Financial AI Assistant for IntelliVest. " +
                        "You MUST only answer queries related to personal finance, budget advice, expense analysis, and investment planning. " +
                        "DO NOT answer general questions, do NOT summarize external PDFs, do NOT write code, and do NOT assist with non-financial tasks. " +
                        "If the user asks you to do any of those non-financial tasks, politely decline and explain that you are specialized in personal finance analysis."))
        );

        Map<String, Object> userPart = Map.of("text", fullPrompt.toString());
        Map<String, Object> contentNode = Map.of(
                "role", "user",
                "parts", List.of(userPart)
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(contentNode),
                "systemInstruction", systemInstruction
        );

        try {
            return webClient.post()
                    .uri("/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(response -> {
                        var candidates = (List<Map<String, Object>>) response.get("candidates");
                        if (candidates == null || candidates.isEmpty()) {
                            return "I received an empty response from the AI backend. Please try again.";
                        }
                        var candidate = candidates.get(0);
                        var content = (Map<String, Object>) candidate.get("content");
                        if (content == null) {
                            return "No content was generated. Please check your query.";
                        }
                        var parts = (List<Map<String, Object>>) content.get("parts");
                        if (parts == null || parts.isEmpty()) {
                            return "No response text was generated.";
                        }
                        return (String) parts.get(0).get("text");
                    })
                    .block();
        } catch (Exception e) {
            System.err.println("Gemini AI request failed: " + e.getMessage());
            return "I am currently running in offline simulation mode due to an API error: " + e.getMessage() + ". Your prompt was: '" + prompt + "'. Consider looking into your top spending categories for potential savings.";
        }
    }
}
