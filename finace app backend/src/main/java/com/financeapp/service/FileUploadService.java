package com.financeapp.service;

import com.financeapp.model.Transaction;
import com.financeapp.model.User;
import com.financeapp.repository.TransactionRepository;
import com.financeapp.repository.UserRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class FileUploadService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public String uploadCSV(MultipartFile file, String email) {
        String fileName = file.getOriginalFilename();
        if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
            return uploadPDF(file, email);
        } else if (fileName != null && (fileName.toLowerCase().endsWith(".html") || fileName.toLowerCase().endsWith(".htm"))) {
            return uploadHTML(file, email);
        }

        int savedCount = 0;
        int errorCount = 0;
        StringBuilder errorLog = new StringBuilder();

        try (java.io.InputStream is = file.getInputStream();
             java.io.InputStreamReader isr = new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8);
             CSVReader reader = new CSVReader(isr)) {

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            java.util.List<String[]> allLines = reader.readAll(); // Still okay for typical statements, but safer to use iterator if needed
            if (allLines.isEmpty()) throw new RuntimeException("The uploaded file is empty.");

            int dateIdx = -1, descIdx = -1, amountIdx = -1, debitIdx = -1, creditIdx = -1, typeIdx = -1, categoryIdx = -1;
            int headerRowIdx = -1;

            // Robust header detection
            for (int i = 0; i < Math.min(allLines.size(), 50); i++) {
                String[] row = allLines.get(i);
                int potentialDate = -1, potentialDesc = -1, potentialAmount = -1, potentialDebit = -1, potentialCredit = -1, potentialCategory = -1, potentialType = -1;
                
                for (int j = 0; j < row.length; j++) {
                    String col = row[j].toLowerCase().trim();
                    // Date detection
                    if (col.contains("date") || col.contains("txn date") || col.contains("value date")) {
                        potentialDate = j;
                    }
                    // Description/Merchant/Receiver detection
                    if ((col.contains("merchant") || col.contains("receiver") || col.matches(".*(desc|particulars|narrat|details|memo|transaction).*")) && 
                        !col.contains("time") && !col.contains("ref") && !col.contains("chq") && !col.contains("date") && !col.contains("amount") && !col.contains("type") && !col.contains("status")) {
                        // Prefer 'merchant' or 'receiver' over 'transaction_description'
                        if (potentialDesc == -1 || col.contains("merchant") || col.contains("receiver")) {
                            potentialDesc = j;
                        }
                    }
                    // Category detection
                    if (col.equals("category") || col.contains("category")) {
                        potentialCategory = j;
                    }
                    // Amount detection
                    if (col.matches(".*(amount|value).*") && !col.contains("date") && !col.contains("account")) {
                        potentialAmount = j;
                    } else if (col.matches(".*(total|balance).*") && !col.contains("date") && !col.contains("account")) {
                        if (potentialAmount == -1) {
                            potentialAmount = j;
                        }
                    }
                    if (col.contains("debit") || col.contains("withdrawal") || col.equals("out")) potentialDebit = j;
                    if (col.contains("credit") || col.contains("deposit") || col.equals("in")) potentialCredit = j;
                    if (col.matches(".*(type|cr/dr|indicator|cr|dr|sign).*")) potentialType = j;
                }
                
                if (potentialDate != -1 && (potentialAmount != -1 || (potentialDebit != -1 && potentialCredit != -1))) {
                    headerRowIdx = i;
                    dateIdx = potentialDate;
                    descIdx = potentialDesc;
                    amountIdx = potentialAmount;
                    debitIdx = potentialDebit;
                    creditIdx = potentialCredit;
                    typeIdx = potentialType;
                    categoryIdx = potentialCategory;
                    break;
                }
            }

            // Fallback for simple/standard CSVs
            if (headerRowIdx == -1) {
                headerRowIdx = -1; // Process from row 0
                dateIdx = 0; descIdx = 1; amountIdx = 2;
            }

            for (int i = headerRowIdx + 1; i < allLines.size(); i++) {
                String[] line = allLines.get(i);
                if (line == null || line.length == 0 || isRowEmpty(line) || isJunkRow(line, descIdx)) continue;

                try {
                    processRow(line, dateIdx, descIdx, amountIdx, debitIdx, creditIdx, typeIdx, categoryIdx, user);
                    savedCount++;
                } catch (Exception lineEx) {
                    errorCount++;
                    if (errorCount <= 10) {
                        errorLog.append("Row ").append(i + 1).append(": ").append(lineEx.getMessage()).append("\n");
                    }
                }
            }
            
            if (savedCount == 0 && errorCount > 0) {
                String msg = "Failed to parse any transactions.";
                if (errorLog.length() > 0) msg += " First error: " + errorLog.toString().split("\n")[0];
                throw new RuntimeException(msg + " Please ensure your CSV has Date, Description, and Amount columns.");
            }

            return String.format("Successfully imported %d transactions. %s", 
                    savedCount, 
                    errorCount > 0 ? "(" + errorCount + " rows skipped due to formatting)" : "");

        } catch (Exception e) {
            throw new RuntimeException("Error processing file: " + e.getMessage());
        }
    }

    private boolean isRowEmpty(String[] row) {
        for (String cell : row) {
            if (cell != null && !cell.trim().isEmpty()) return false;
        }
        return true;
    }

    private void processRow(String[] line, int dateIdx, int descIdx, int amountIdx, int debitIdx, int creditIdx, int typeIdx, int categoryIdx, User user) {
        // Find the actual maximum index we need to access
        int maxIdx = Math.max(dateIdx, Math.max(descIdx, Math.max(amountIdx, Math.max(debitIdx, Math.max(creditIdx, Math.max(typeIdx, categoryIdx))))));
        if (line.length <= maxIdx || maxIdx < 0) {
            return;
        }

        String dateStr = line[dateIdx].trim();
        if (dateStr.isEmpty()) return;

        String title = (descIdx != -1 && descIdx < line.length) ? line[descIdx].trim() : "Untitled Transaction";
        
        Double amount = 0.0;
        if (debitIdx != -1 && creditIdx != -1 && debitIdx < line.length && creditIdx < line.length) {
            String debStr = line[debitIdx].trim();
            String creStr = line[creditIdx].trim();
            Double debit = !debStr.isEmpty() ? parseAmount(debStr) : 0.0;
            Double credit = !creStr.isEmpty() ? parseAmount(creStr) : 0.0;
            if (credit != 0) amount = Math.abs(credit);
            else if (debit != 0) amount = -Math.abs(debit);
        } else if (amountIdx != -1 && amountIdx < line.length) {
            amount = parseAmount(line[amountIdx]);
            if (typeIdx != -1 && typeIdx < line.length) {
                String type = line[typeIdx].toLowerCase().trim();
                if (type.contains("dr") || type.contains("debit") || type.contains("out") || type.equals("d") || type.contains("db") || type.contains("withdrawal") || type.equals("w")) {
                    amount = -Math.abs(amount);
                } else if (type.contains("cr") || type.contains("credit") || type.contains("in") || type.equals("c") || type.contains("deposit") || type.contains("dep")) {
                    amount = Math.abs(amount);
                }
            }
        }

        if (amount == 0.0 && title.equals("Untitled Transaction")) return;

        LocalDate date = parseDate(dateStr);
        if (date == null) return;
        
        String category = "Other";
        if (categoryIdx != -1 && categoryIdx < line.length && !line[categoryIdx].trim().isEmpty()) {
            category = line[categoryIdx].trim();
        } else {
            String titleLower = title.toLowerCase();
            if (titleLower.contains("@")) {
                if (titleLower.contains("paytm") || titleLower.contains("merchant") || titleLower.contains("biz") || titleLower.contains("swiggy") || titleLower.contains("zomato") || titleLower.contains("amazon") || titleLower.contains("flipkart")) {
                    category = "Business Account";
                } else {
                    category = "Personal Account";
                }
            } else {
                category = com.financeapp.util.CategoryUtil.categorize(title);
                if (category.equals("Other") && !title.equals("Untitled Transaction")) {
                    category = "Personal Account";
                }
            }
        }

        boolean exists = transactionRepository.existsByUserAndTitleAndAmountAndDate(user, title, amount, date);
        if (exists) return;

        Transaction transaction = Transaction.builder()
                .title(title.length() > 255 ? title.substring(0, 252) + "..." : title)
                .amount(amount)
                .category(category)
                .date(date)
                .user(user)
                .build();

        transactionRepository.save(transaction);
    }

    private Double parseAmount(String amountStr) {
        try {
            String clean = amountStr.trim().replaceAll("[^0-9.\\-]", "");
            if (clean.isEmpty()) return 0.0;
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private String uploadPDF(MultipartFile file, String email) {
        int savedCount = 0;
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            try (PDDocument document = Loader.loadPDF(file.getBytes())) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setSortByPosition(true); // Improve reading order
                String text = stripper.getText(document);

                // Pattern 1: Date [Description] Amount (Common)
                Pattern p1 = Pattern.compile("(\\d{1,4}[-/.]\\d{1,2}[-/.]\\d{1,4}|\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{2,4})\\s+([A-Za-z0-9\\s\\.\\*\\-#]{3,50}?)\\s+(-?[\\d,]+(?:\\.\\d{1,2})?)");
                
                // Pattern 2: [Description] Date Amount (Some banks)
                Pattern p2 = Pattern.compile("([A-Za-z0-9\\s\\.\\*\\-#]{3,50}?)\\s+(\\d{1,4}[-/.]\\d{1,2}[-/.]\\d{1,4})\\s+(-?[\\d,]+(?:\\.\\d{1,2})?)");

                Matcher m1 = p1.matcher(text);
                while (m1.find()) {
                    try {
                        if (saveTransactionIfNew(m1.group(1), m1.group(2), m1.group(3), user)) savedCount++;
                    } catch (Exception e) {}
                }

                if (savedCount == 0) {
                    Matcher m2 = p2.matcher(text);
                    while (m2.find()) {
                        try {
                            if (saveTransactionIfNew(m2.group(2), m2.group(1), m2.group(3), user)) savedCount++;
                        } catch (Exception e) {}
                    }
                }
            }

            if (savedCount == 0) return "Uploaded PDF, but no transactions could be extracted. Please use CSV for best results.";
            return String.format("Successfully extracted %d transactions from PDF.", savedCount);

        } catch (Exception e) {
            throw new RuntimeException("Error processing PDF: " + e.getMessage());
        }
    }

    private boolean saveTransactionIfNew(String dateStr, String title, String amountStr, User user) {
        LocalDate date = parseDate(dateStr);
        Double amount = Double.parseDouble(amountStr.replace(",", ""));
        String cleanTitle = title.trim();

        if (transactionRepository.existsByUserAndTitleAndAmountAndDate(user, cleanTitle, amount, date)) return false;

        Transaction transaction = Transaction.builder()
                .title(cleanTitle)
                .amount(amount)
                .category(com.financeapp.util.CategoryUtil.categorize(cleanTitle))
                .date(date)
                .user(user)
                .build();

        transactionRepository.save(transaction);
        return true;
    }

    private LocalDate parseDate(String dateStr) {
        String cleanDate = dateStr.trim();
        
        // Handle timestamps (e.g., "2023-11-05 15:54:38" or "2023-11-05T15:54:38")
        if (cleanDate.contains(" ")) {
            cleanDate = cleanDate.split(" ")[0];
        } else if (cleanDate.contains("T")) {
            cleanDate = cleanDate.split("T")[0];
        }

        String[] formats = {
            "dd/MM/yyyy", "dd-MM-yyyy", "dd.MM.yyyy",
            "dd/MM/yy", "dd-MM-yy", "dd.MM.yy",
            "yyyy-MM-dd", "MM/dd/yyyy", "yyyy/MM/dd", 
            "d/M/yyyy", "M/d/yyyy", "dd MMM yyyy", "dd MMMM yyyy", 
            "MMM dd, yyyy", "MMMM dd, yyyy",
            "dd-MMM-yy", "dd-MMM-yyyy", "dd/MMM/yy", "dd/MMM/yyyy", "d-MMM-yy"
        };
        
        LocalDate now = LocalDate.now();
        LocalDate bestDate = null;

        for (String format : formats) {
            try {
                LocalDate parsed = LocalDate.parse(cleanDate, DateTimeFormatter.ofPattern(format, Locale.ENGLISH));
                // If the date is reasonably in the past or very near future, it's likely correct
                if (!parsed.isAfter(now.plusDays(7))) {
                    return parsed;
                }
                if (bestDate == null) bestDate = parsed; // Keep the first match as fallback
            } catch (Exception e) { /* continue */ }
        }
        
        if (bestDate != null) return bestDate;

        try { return LocalDate.parse(cleanDate); } catch (Exception e) {
            return null;
        }
    }

    private String uploadHTML(MultipartFile file, String email) {
        int savedCount = 0;
        int errorCount = 0;
        StringBuilder errorLog = new StringBuilder();

        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            org.jsoup.nodes.Document doc = org.jsoup.Jsoup.parse(file.getInputStream(), "UTF-8", "");
            org.jsoup.select.Elements rows = doc.select("tr");
            java.util.List<String[]> allLines = new java.util.ArrayList<>();
            
            for (org.jsoup.nodes.Element row : rows) {
                org.jsoup.select.Elements cols = row.select("th, td");
                String[] line = new String[cols.size()];
                for (int i = 0; i < cols.size(); i++) {
                    line[i] = cols.get(i).text();
                }
                allLines.add(line);
            }

            if (allLines.isEmpty()) throw new RuntimeException("No tables/transactions found in the HTML file.");

            int dateIdx = -1, descIdx = -1, amountIdx = -1, debitIdx = -1, creditIdx = -1, typeIdx = -1, categoryIdx = -1;
            int headerRowIdx = -1;

            // Robust header detection
            for (int i = 0; i < Math.min(allLines.size(), 50); i++) {
                String[] row = allLines.get(i);
                int potentialDate = -1, potentialDesc = -1, potentialAmount = -1, potentialDebit = -1, potentialCredit = -1, potentialCategory = -1, potentialType = -1;
                
                for (int j = 0; j < row.length; j++) {
                    if (row[j] == null) continue;
                    String col = row[j].toLowerCase().trim();
                    if (col.contains("date") || col.contains("txn date") || col.contains("value date")) {
                        potentialDate = j;
                    }
                    if ((col.contains("merchant") || col.contains("receiver") || col.matches(".*(desc|particulars|narrat|details|memo|transaction).*")) && 
                        !col.contains("time") && !col.contains("ref") && !col.contains("chq") && !col.contains("date") && !col.contains("amount") && !col.contains("type") && !col.contains("status")) {
                        if (potentialDesc == -1 || col.contains("merchant") || col.contains("receiver")) {
                            potentialDesc = j;
                        }
                    }
                    if (col.equals("category") || col.contains("category")) {
                        potentialCategory = j;
                    }
                    if (col.matches(".*(amount|value).*") && !col.contains("date") && !col.contains("account")) {
                        potentialAmount = j;
                    } else if (col.matches(".*(total|balance).*") && !col.contains("date") && !col.contains("account")) {
                        if (potentialAmount == -1) {
                            potentialAmount = j;
                        }
                    }
                    if (col.contains("debit") || col.contains("withdrawal") || col.equals("out")) potentialDebit = j;
                    if (col.contains("credit") || col.contains("deposit") || col.equals("in")) potentialCredit = j;
                    if (col.matches(".*(type|cr/dr|indicator|cr|dr|sign).*")) potentialType = j;
                }
                
                if (potentialDate != -1 && (potentialAmount != -1 || (potentialDebit != -1 && potentialCredit != -1))) {
                    headerRowIdx = i;
                    dateIdx = potentialDate;
                    descIdx = potentialDesc;
                    amountIdx = potentialAmount;
                    debitIdx = potentialDebit;
                    creditIdx = potentialCredit;
                    typeIdx = potentialType;
                    categoryIdx = potentialCategory;
                    break;
                }
            }

            if (headerRowIdx == -1) {
                headerRowIdx = -1; // Process from row 0
                dateIdx = 0; descIdx = 1; amountIdx = 2;
            }

            for (int i = headerRowIdx + 1; i < allLines.size(); i++) {
                String[] line = allLines.get(i);
                if (line == null || line.length == 0 || isRowEmpty(line) || isJunkRow(line, descIdx)) continue;

                try {
                    processRow(line, dateIdx, descIdx, amountIdx, debitIdx, creditIdx, typeIdx, categoryIdx, user);
                    savedCount++;
                } catch (Exception lineEx) {
                    errorCount++;
                    if (errorCount <= 10) {
                        errorLog.append("Row ").append(i + 1).append(": ").append(lineEx.getMessage()).append("\n");
                    }
                }
            }
            
            if (savedCount == 0 && errorCount > 0) {
                String msg = "Failed to parse any transactions from HTML.";
                if (errorLog.length() > 0) msg += " First error: " + errorLog.toString().split("\n")[0];
                throw new RuntimeException(msg + " Please ensure the HTML has a table with Date, Description, and Amount columns.");
            }

            return String.format("Successfully imported %d transactions from HTML. %s", 
                    savedCount, 
                    errorCount > 0 ? "(" + errorCount + " rows skipped due to formatting)" : "");

        } catch (Exception e) {
            throw new RuntimeException("Error processing HTML file: " + e.getMessage());
        }
    }

    private boolean isJunkRow(String[] line, int descIdx) {
        if (line == null || line.length == 0) return true;
        String content = String.join(" ", line).toLowerCase();
        
        // Filter out summary/header/footer noise
        if (content.contains("opening balance") || content.contains("closing balance") || 
            content.contains("total amount") || content.contains("grand total") ||
            content.contains("carried forward") || content.contains("brought forward") ||
            content.contains("page total") || content.contains("report generated")) {
            return true;
        }

        // If description is just whitespace or common non-txn words
        if (descIdx != -1 && descIdx < line.length) {
            String d = line[descIdx].toLowerCase().trim();
            if (d.isEmpty() || d.equals("description") || d.equals("particulars") || d.equals("narrative")) return true;
        }

        return false;
    }
}
