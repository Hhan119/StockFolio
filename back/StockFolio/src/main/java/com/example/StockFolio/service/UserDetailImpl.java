package com.example.StockFolio.service;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;

import com.example.StockFolio.entity.User;

public interface UserDetailImpl {
	public UserDetail build(User user);
	public boolean isAccountNonExpired();
	public boolean isAccountNonLocked();
	public boolean isCredentialsNonExpired();
	public boolean isEnabled();
	public String getUsername();
	public Long getId();
}
