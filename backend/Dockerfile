# Base image for runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000

# Build image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY *.sln ./
COPY DataVizApp/*.csproj ./DataVizApp/

# Restore dependencies
RUN dotnet restore

# Copy the rest of the app
COPY . ./

WORKDIR /src/DataVizApp
RUN dotnet build -c Release -o /app/build
RUN dotnet publish -c Release -o /app/publish

# Final image
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "DataVizApp.dll"]