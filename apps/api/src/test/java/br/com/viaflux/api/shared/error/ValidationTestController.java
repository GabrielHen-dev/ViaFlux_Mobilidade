package br.com.viaflux.api.shared.error;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ValidationTestController {

    @PostMapping("/test/validation")
    void validate(@Valid @RequestBody ValidationRequest request) {
    }

    record ValidationRequest(@NotBlank(message = "O nome é obrigatório.") String name) {
    }
}
