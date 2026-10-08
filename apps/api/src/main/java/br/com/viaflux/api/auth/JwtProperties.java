package br.com.viaflux.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties("viaflux.jwt")
public record JwtProperties(String secret, Duration accessTtl, Duration refreshTtl) {
}
