package com.example.StockFolio.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import com.example.StockFolio.entity.User;

public interface UserDetailServiceImpl {
	public UserDetails loadUserByUsername(String username);
	
}
