package com.financeapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class AIService {

    private final WebClient webClient;
    private final String apiKey;

    public AIService(@Value("${openai.api.key:}") String apiKey) {
        this.apiKey = apiKey;
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1/chat/completions")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
    }

    public String askAI(String prompt) {
        if (apiKey == null || apiKey.isEmpty() || apiKey.contains("placeholder") || apiKey.equals("sk-placeholder-key-replace-me")) {
            return "This is a simulated AI response. Please configure a valid OpenAI API key in application.properties for real insights. Based on your prompt: '" + prompt + "', I recommend maintaining a 20% savings rate and reviewing your recent 'Shopping' expenses to optimize your budget.";
        }

        Map<String, Object> request = Map.of(
                "model", "gpt-4o-mini",
                "messages", new Object[]{
                        Map.of("role", "user", "content", prompt)
                }
        );

        try {
            return webClient.post()
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .map(response -> {
                        var choices = (java.util.List<Map<String, Object>>) response.get("choices");
                        var message = (Map<String, Object>) choices.get(0).get("message");
                        return (String) message.get("content");
                    })
                    .block();
        } catch (Exception e) {
            System.err.println("AI request failed: " + e.getMessage());
            return "I am currently running in offline simulation mode due to an API error. Your prompt was: '" + prompt + "'. Consider looking into your top spending categories for potential savings.";
        }
    }
}
