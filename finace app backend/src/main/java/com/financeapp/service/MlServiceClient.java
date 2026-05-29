package com.financeapp.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class MlServiceClient {

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> predictAllocation(Map<String, Object> requestData) {
        return postRequest("/predict/allocation", requestData);
    }

    public Map<String, Object> analyzeBehavior(Map<String, Object> requestData) {
        return postRequest("/predict/behavior", requestData);
    }

    public Map<String, Object> predictGoalSuccess(Map<String, Object> requestData) {
        return postRequest("/predict/goal-success", requestData);
    }

    private Map<String, Object> postRequest(String endpoint, Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            
            return restTemplate.postForObject(mlServiceUrl + endpoint, entity, Map.class);
        } catch (Exception e) {
            System.err.println("ML Service Error: " + e.getMessage());
            // Return fallback/empty response if ML service is down
            return Map.of("success", false, "error", e.getMessage());
        }
    }
}
