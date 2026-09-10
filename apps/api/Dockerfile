FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app
RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=builder /build/target/*.jar app.jar
RUN mkdir -p /var/viaflux/anexos && chown -R spring:spring /app /var/viaflux
USER spring
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseContainerSupport"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
