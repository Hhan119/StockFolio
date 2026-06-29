package com.example.StockFolio.service;

import com.example.StockFolio.dto.AuthDto;

public interface AuthServiceImpl {

	public AuthDto.TokenResponse signup(AuthDto.SignupRequest req);
	public AuthDto.TokenResponse login(AuthDto.LoginRequest req);
}
