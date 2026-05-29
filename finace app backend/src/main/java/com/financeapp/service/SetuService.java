package com.financeapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.financeapp.model.ConnectedBank;
import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.ConnectedBankRepository;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SetuService {

    private final ConnectedBankRepository connectedBankRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final ConnectedBankService connectedBankService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${setu.client-id}")
    private String clientId;

    @Value("${setu.client-secret}")
    private String clientSecret;

    @Value("${setu.product-instance-id}")
    private String productInstanceId;

    @Value("${setu.base-url}")
    private String baseUrl;

    public SetuService(ConnectedBankRepository connectedBankRepository,
                       UserRepository userRepository,
                       TransactionRepository transactionRepository,
                       ConnectedBankService connectedBankService) {
        this.connectedBankRepository = connectedBankRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.connectedBankService = connectedBankService;
        this.objectMapper = new ObjectMapper();
        this.httpClient = HttpClient.newHttpClient();
    }

    public boolean isSetuConfigured() {
        return clientId != null && !clientId.trim().isEmpty() &&
                clientSecret != null && !clientSecret.trim().isEmpty() &&
                productInstanceId != null && !productInstanceId.trim().isEmpty();
    }

    public Map<String, String> createConsent(String email) {
        if (!isSetuConfigured()) {
            // Simulated Consent Response
            Map<String, String> response = new HashMap<>();
            response.put("consentId", "sim_consent_" + System.currentTimeMillis());
            response.put("url", "http://localhost:5173/upload?provider=setu_simulated&consent_id=sim_consent_" + System.currentTimeMillis());
            return response;
        }

        try {
            LocalDate today = LocalDate.now();
            Map<String, Object> detail = new HashMap<>();
            detail.put("consentMode", "STORE");
            detail.put("consentTypes", List.of("TRANSACTIONS", "PROFILE", "SUMMARY"));
            detail.put("fiTypes", List.of("DEPOSIT", "SAVINGS"));

            Map<String, String> dataConsumer = new HashMap<>();
            dataConsumer.put("id", "WealthIntel");
            detail.put("DataConsumer", dataConsumer);

            Map<String, String> customer = new HashMap<>();
            customer.put("id", "9876543210@upi"); // Example test phone VPA
            detail.put("Customer", customer);

            Map<String, Object> purpose = new HashMap<>();
            purpose.put("code", "101");
            purpose.put("refUri", "https://setu.co");
            purpose.put("text", "Personal Finance Management");
            purpose.put("Category", Map.of("type", "string"));
            detail.put("Purpose", purpose);

            Map<String, String> dataRange = new HashMap<>();
            dataRange.put("from", today.minusMonths(12).atStartOfDay().toString() + "Z");
            dataRange.put("to", today.atStartOfDay().toString() + "Z");
            detail.put("FIDataRange", dataRange);

            Map<String, String> consentLife = new HashMap<>();
            consentLife.put("from", today.atStartOfDay().toString() + "Z");
            consentLife.put("to", today.plusYears(1).atStartOfDay().toString() + "Z");
            detail.put("ConsentLife", consentLife);

            Map<String, Object> frequency = new HashMap<>();
            frequency.put("value", 1);
            frequency.put("unit", "MONTH");
            detail.put("Frequency", frequency);

            Map<String, Object> dataLife = new HashMap<>();
            dataLife.put("value", 1);
            dataLife.put("unit", "MONTH");
            detail.put("DataLife", dataLife);

            detail.put("DataFilter", List.of());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("Detail", detail);
            requestBody.put("redirectUrl", "http://localhost:5173/upload?provider=setu");

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/consents"))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", clientId)
                    .header("x-client-secret", clientSecret)
                    .header("x-product-instance-id", productInstanceId)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 201 && response.statusCode() != 200) {
                throw new RuntimeException("Setu API error: Status " + response.statusCode() + " - " + response.body());
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            Map<String, String> result = new HashMap<>();
            result.put("consentId", responseJson.get("id").asText());
            result.put("url", responseJson.get("url").asText());
            return result;

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Setu Consent Request: " + e.getMessage(), e);
        }
    }

    @Transactional
    public String syncData(String consentId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!isSetuConfigured() || consentId.startsWith("sim_consent_")) {
            // Simulated Consent Callback Sync - Connect HDFC & SBI with mock data
            connectedBankService.connectBank("hdfc", email);
            connectedBankService.connectBank("sbi", email);
            return "Setu Sandbox Simulation: Successfully linked HDFC and SBI accounts.";
        }

        try {
            // 1. Establish Data Session
            LocalDate today = LocalDate.now();
            Map<String, Object> sessionRequest = new HashMap<>();
            sessionRequest.put("consentId", consentId);
            sessionRequest.put("FIDataRange", Map.of(
                    "from", today.minusMonths(3).atStartOfDay().toString() + "Z",
                    "to", today.atStartOfDay().toString() + "Z"
            ));

            String jsonPayload = objectMapper.writeValueAsString(sessionRequest);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/sessions"))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", clientId)
                    .header("x-client-secret", clientSecret)
                    .header("x-product-instance-id", productInstanceId)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 201 && response.statusCode() != 200) {
                throw new RuntimeException("Failed to create Setu Session: " + response.body());
            }

            JsonNode sessionJson = objectMapper.readTree(response.body());
            String sessionId = sessionJson.get("id").asText();

            // 2. Poll & Fetch Data (In Sandbox mode, data is usually instantly processed)
            // We sleep briefly to let the sandbox FIP process the request
            Thread.sleep(1500);

            HttpRequest dataRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/sessions/" + sessionId + "/decrypted-data"))
                    .header("x-client-id", clientId)
                    .header("x-client-secret", clientSecret)
                    .header("x-product-instance-id", productInstanceId)
                    .GET()
                    .build();

            HttpResponse<String> dataResponse = httpClient.send(dataRequest, HttpResponse.BodyHandlers.ofString());
            if (dataResponse.statusCode() != 200) {
                throw new RuntimeException("Failed to fetch Setu Decrypted Data: " + dataResponse.body());
            }

            JsonNode dataJson = objectMapper.readTree(dataResponse.body());
            JsonNode accounts = dataJson.get("account");

            int savedCount = 0;
            if (accounts != null && accounts.isArray()) {
                for (JsonNode acc : accounts) {
                    String maskedAccNo = acc.get("maskedAccNo").asText("XXXX-1102");
                    String fipId = acc.get("fipId") != null ? acc.get("fipId").asText() : "HDFC";
                    String bankName = cleanFipId(fipId);

                    // Connect the bank account in local DB
                    if (!connectedBankRepository.existsByUserAndBankName(user, bankName)) {
                        ConnectedBank cb = ConnectedBank.builder()
                                .bankName(bankName)
                                .accountName(bankName.toUpperCase() + " Savings")
                                .accountNumber("**** " + maskedAccNo.substring(Math.max(0, maskedAccNo.length() - 4)))
                                .status("Active Sync")
                                .lastSync(LocalDate.now())
                                .user(user)
                                .build();
                        connectedBankRepository.save(cb);
                    }

                    JsonNode transactions = acc.get("transactions");
                    if (transactions != null && transactions.isArray()) {
                        for (JsonNode tx : transactions) {
                            String narration = tx.get("narration").asText("UPI Transaction");
                            Double amount = tx.get("amount").asDouble(0.0);
                            String type = tx.get("type").asText("DEBIT");
                            String valueDateStr = tx.get("valueDate").asText(today.toString());

                            LocalDate date = LocalDate.parse(valueDateStr.split("T")[0]);
                            double signedAmount = "DEBIT".equalsIgnoreCase(type) ? -Math.abs(amount) : Math.abs(amount);

                            if (!transactionRepository.existsByUserAndTitleAndAmountAndDate(user, narration, signedAmount, date)) {
                                Transaction transaction = Transaction.builder()
                                        .title(narration)
                                        .amount(signedAmount)
                                        .category(com.financeapp.util.CategoryUtil.categorize(narration))
                                        .date(date)
                                        .note("Imported via Setu Account Aggregator (" + bankName.toUpperCase() + ")")
                                        .user(user)
                                        .build();
                                transactionRepository.save(transaction);
                                savedCount++;
                            }
                        }
                    }
                }
            }

            return String.format("Successfully synced %d transactions from Setu Account Aggregator.", savedCount);

        } catch (Exception e) {
            throw new RuntimeException("Error fetching Setu Financial Data: " + e.getMessage(), e);
        }
    }

    private String cleanFipId(String fipId) {
        String lower = fipId.toLowerCase();
        if (lower.contains("hdfc")) return "hdfc";
        if (lower.contains("sbi") || lower.contains("state")) return "sbi";
        if (lower.contains("icici")) return "icici";
        if (lower.contains("citi")) return "citibank";
        if (lower.contains("axis")) return "axis";
        return fipId;
    }
}
