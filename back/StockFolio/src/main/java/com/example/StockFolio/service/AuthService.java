package com.example.StockFolio.service;

import com.example.StockFolio.dto.AuthDto;
import com.example.StockFolio.entity.User;
import com.example.StockFolio.repository.UserRepository;
import com.example.StockFolio.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Transactional
    public AuthDto.TokenResponse signup(AuthDto.SignupRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다: " + req.getUsername());
        }

        User user = User.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .email(req.getEmail())
                .role(User.Role.USER)
                .build();
        userRepository.save(user);

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(auth);
        String token = jwtUtils.generateToken(auth);
        UserDetail details = (UserDetail) auth.getPrincipal();

        return AuthDto.TokenResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(details.getId())
                .username(details.getUsername())
                .role(user.getRole().name())
                .build();
    }

    public AuthDto.TokenResponse login(AuthDto.LoginRequest req) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        SecurityContextHolder.getContext().setAuthentication(auth);
        String token = jwtUtils.generateToken(auth);
        UserDetail details = (UserDetail) auth.getPrincipal();
        User user = userRepository.findByUsername(details.getUsername()).orElseThrow();

        return AuthDto.TokenResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(details.getId())
                .username(details.getUsername())
                .role(user.getRole().name())
                .build();
    }

    public boolean isUsernameAvailable(String username) {
        return username != null && !username.isBlank() && !userRepository.existsByUsername(username);
    }
}
