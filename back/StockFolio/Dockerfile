FROM eclipse-temurin:17-jdk-jammy AS build

WORKDIR /app

COPY mvnw mvnw
COPY .mvn .mvn
COPY pom.xml pom.xml
RUN chmod +x mvnw
RUN ./mvnw -DskipTests dependency:go-offline

COPY src src
COPY scripts scripts
RUN ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

ENV SPRING_PROFILES_ACTIVE=local-server
ENV PYTHON_BIN=python3

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar app.jar
COPY --from=build /app/scripts scripts

RUN pip3 install --no-cache-dir -r scripts/requirements.txt

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
