package com.example.StockFolio.dto;

import jakarta.validation.constraints.*;
import lombok.*;
 
public class AuthDto {
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SignupRequest {
        @NotBlank(message = "아이디를 입력하세요.")
        @Size(min = 4, max = 50, message = "아이디는 4자 이상이어야 합니다.")
        private String username;
 
        @NotBlank(message = "비밀번호를 입력하세요.")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{7,100}$",
                message = "비밀번호는 영문과 특수문자를 포함해 7자 이상이어야 합니다."
        )
        private String password;
 
        @NotBlank(message = "이메일을 입력하세요.")
        @Email(message = "올바른 이메일 형식이 아닙니다.")
        private String email;
    }
 
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
    }
 
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TokenResponse {
        private String token;
        private String type;
        private Long userId;
        private String username;
        private String role;
    }
}
