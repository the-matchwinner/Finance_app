package com.financeapp.util;

public class CategoryUtil {

    public static String categorize(String title) {
    
        String t = title.toLowerCase().trim();
    
        if (t.contains("swiggy") || t.contains("zomato") || t.contains("restaurant") || t.contains("food") || t.contains("eats") || t.contains("blinkit") || t.contains("bigbasket") || t.contains("zepto") || t.contains("instamart") || t.contains("mcdonald") || t.contains("starbucks") || t.contains("pizza")) {
            return "Food & Dining";
        }
    
        if (t.contains("uber") || t.contains("ola") || t.contains("metro") || t.contains("irctc") || t.contains("petrol") || t.contains("fuel") || t.contains("rapido") || t.contains("indigo") || t.contains("air india") || t.contains("railway")) {
            return "Transport";
        }
    
        if (t.contains("amazon") || t.contains("flipkart") || t.contains("myntra") || t.contains("shopping") || t.contains("reliance") || t.contains("ajio") || t.contains("nykaa") || t.contains("dmart") || t.contains("zudio")) {
            return "Shopping";
        }
    
        if (t.contains("salary") || t.contains("income") || t.contains("dividend") || t.contains("interest") || t.contains("refund") || t.contains("payout")) {
            return "Income";
        }

        if (t.contains("gst") || t.contains("tax") || t.contains("pvt ltd") || t.contains("corp") || t.contains("limited") || t.contains("tds") || t.contains("invoice") || t.contains("business") || t.contains("vendor") || t.contains("merchant")) {
            return "Business";
        }

        if (t.contains("jio") || t.contains("airtel") || t.contains("electricity") || t.contains("water") || t.contains("recharge") || t.contains("bill") || t.contains("bescom") || t.contains("tneb") || t.contains("gas") || t.contains("vi ")) {
            return "Utilities";
        }

        if (t.contains("rent") || t.contains("maintenance") || t.contains("property") || t.contains("society") || t.contains("nobroker") || t.contains("urban company")) {
            return "Housing";
        }

        if (t.contains("zerodha") || t.contains("groww") || t.contains("upstox") || t.contains("mutual fund") || t.contains("sip") || t.contains("indmoney") || t.contains("angel one") || t.contains("invest")) {
            return "Investment";
        }

        if (t.contains("hospital") || t.contains("pharmacy") || t.contains("medical") || t.contains("apollo") || t.contains("practo") || t.contains("pharmeasy") || t.contains("netmeds")) {
            return "Health";
        }

        if (t.contains("netflix") || t.contains("prime") || t.contains("hotstar") || t.contains("spotify") || t.contains("youtube") || t.contains("subscription")) {
            return "Entertainment";
        }

        if (t.contains("udemy") || t.contains("coursera") || t.contains("college") || t.contains("school") || t.contains("fees") || t.contains("education")) {
            return "Education";
        }

        if (t.contains("upi") || t.contains("transfer") || t.contains("paytm") || t.contains("gpay") || t.contains("phonepe") || t.contains("neft") || t.contains("rtgs") || t.contains("imps")) {
            return "Transfer";
        }
    
        return "Other";
    }
}
