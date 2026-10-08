package br.com.viaflux.api.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "viaflux.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
