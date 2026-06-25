package com.financeapp.util;

import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;
import java.util.regex.Pattern;

public class EmailValidator {
    
    // Strict general email regex pattern (blocks special characters like single quotes, asterisks, etc.)
    private static final Pattern STRICT_EMAIL_PATTERN = 
            Pattern.compile("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");

    public static boolean hasMxRecord(String email) {
        if (email == null) {
            return false;
        }
        
        email = email.trim();
        
        // 1. Basic format and strict character validation
        if (!STRICT_EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }
        
        String[] parts = email.split("@");
        if (parts.length != 2) {
            return false;
        }
        
        String localPart = parts[0];
        String domain = parts[1].toLowerCase();
        
        // 2. Block obviously fake or placeholder domains
        if (domain.equals("test.com") || 
            domain.equals("example.com") || 
            domain.equals("fake.com")) {
            return false;
        }

        // 3. Provider-specific username rules
        if (domain.equals("gmail.com")) {
            // Gmail username rules:
            // - 6 to 30 characters
            // - Only a-z, 0-9, and periods (.)
            // - Periods don't count towards length, and are ignored.
            // - Plus signs (+) are allowed for sub-addressing, but only the part before + counts.
            String baseLocal = localPart;
            if (localPart.contains("+")) {
                baseLocal = localPart.split("\\+")[0];
            }
            // Remove dots to calculate real length
            String cleanLocal = baseLocal.replace(".", "");
            if (cleanLocal.length() < 6 || cleanLocal.length() > 30) {
                return false;
            }
            // Must contain only letters and numbers
            if (!cleanLocal.matches("^[a-zA-Z0-9]+$")) {
                return false;
            }
        } else if (domain.equals("yahoo.com")) {
            // Yahoo rules:
            // - 4 to 32 characters
            // - Only letters, numbers, underscores (_), and periods (.)
            if (localPart.length() < 4 || localPart.length() > 32) {
                return false;
            }
            if (!localPart.matches("^[a-zA-Z0-9._]+$")) {
                return false;
            }
        } else if (domain.equals("outlook.com") || domain.equals("hotmail.com") || 
                   domain.equals("live.com") || domain.equals("msn.com")) {
            // Microsoft rules:
            // - Must start with a letter
            // - Only letters, numbers, periods (.), hyphens (-), and underscores (_)
            if (localPart.isEmpty() || !Character.isLetter(localPart.charAt(0))) {
                return false;
            }
            if (!localPart.matches("^[a-zA-Z0-9._-]+$")) {
                return false;
            }
        }

        // 4. DNS MX Record lookup
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            InitialDirContext ictx = new InitialDirContext(env);
            Attributes attrs = ictx.getAttributes(domain, new String[] { "MX" });
            Attribute attr = attrs.get("MX");
            return attr != null && attr.size() > 0;
        } catch (Exception e) {
            return false; // Domain has no MX record or doesn't exist
        }
    }
}

