# Modern Spring Boot 3.x+ & Spring Security 6 Patterns

## 1. Spring Security 6 (`SecurityFilterChain` + Lambda DSL)

Never extend `WebSecurityConfigurerAdapter` or call `.antMatchers()` / `.authorizeRequests()` / `.csrf().disable()`.
Keep CSRF protection enabled by default. Only disable CSRF for stateless APIs using an authentication model where browsers do not attach credentials automatically (such as `Authorization: Bearer <JWT>`, **not** HTTP Basic or cookie-backed sessions).

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    // Default: CSRF protection stays enabled (safe even if HTTP Basic or cookies are used)
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .build();
    }

    // Only disable CSRF when using non-browser-attached credentials (e.g., Bearer JWT):
    // http.csrf(AbstractHttpConfigurer::disable)
    //     .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
}
```

---

## 2. `RestClient` & `@HttpExchange` (Spring Boot 3.2+)

Prefer `RestClient` (fluent synchronous client) or declarative `@HttpExchange` interfaces over `new RestTemplate()`.

```java
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WeatherClient {
    private final RestClient restClient;

    public WeatherClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("https://api.weather.example").build();
    }

    public String currentForecast(String city) {
        return restClient.get()
            .uri("/v1/forecast?city={city}", city)
            .retrieve()
            .body(String.class);
    }
}
```

---

## 3. Constructor Injection & `jakarta.*` Validation

```java
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
    @NotBlank String bucket,
    String region
) {}
```
