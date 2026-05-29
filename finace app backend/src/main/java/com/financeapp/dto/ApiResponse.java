package com.financeapp.dto;

public class ApiResponse<T> {

    private boolean success;
    private int status;
    private String message;
    private T data;

    private ApiResponse() {}

    public static <T> ApiResponse<T> success(T data, String message, int status) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = true;
        response.status = status;
        response.message = message;
        response.data = data;
        return response;
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return success(data, message, 200);
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Success", 200);
    }

    public static <T> ApiResponse<T> error(String message, int status) {
        ApiResponse<T> response = new ApiResponse<>();
        response.success = false;
        response.status = status;
        response.message = message;
        response.data = null;
        return response;
    }

    public boolean isSuccess() { return success; }
    public int getStatus() { return status; }
    public String getMessage() { return message; }
    public T getData() { return data; }
}
