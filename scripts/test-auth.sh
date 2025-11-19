#!/bin/bash

# Authentication Testing Script
# Usage: ./test-auth.sh

BASE_URL="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Authentication API Testing ===${NC}\n"

# 1. Health Check
echo -e "${YELLOW}1. Testing Health Check...${NC}"
curl -s -X GET "$BASE_URL/health" | python3 -m json.tool 2>/dev/null || curl -s -X GET "$BASE_URL/health"
echo -e "\n"

# 2. Login with Demo Account
echo -e "${YELLOW}2. Testing Login (Demo Account)...${NC}"
COOKIE_JAR="/tmp/test_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract tokens from cookies
ACCESS_TOKEN=$(grep -i "accessToken" "$COOKIE_JAR" 2>/dev/null | awk '{print $7}' | head -1)
REFRESH_TOKEN=$(grep -i "refreshToken" "$COOKIE_JAR" 2>/dev/null | awk '{print $7}' | head -1)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}Note: Tokens are stored in HTTP-only cookies (secure). Using cookies for subsequent requests.${NC}"
else
  echo -e "\n${GREEN}Access Token Cookie: ${ACCESS_TOKEN:0:50}...${NC}"
  echo -e "${GREEN}Refresh Token Cookie: ${REFRESH_TOKEN:0:50}...${NC}\n"
fi

# 3. Get Current User (Protected) - Using cookies
echo -e "${YELLOW}3. Testing Get Current User (Protected Endpoint - Using Cookies)...${NC}"
curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/auth/me" | python3 -m json.tool 2>/dev/null || \
curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/auth/me"
echo -e "\n"

# 4. Register New User
echo -e "${YELLOW}4. Testing Registration...${NC}"
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"testuser${TIMESTAMP}@example.com\",
    \"password\": \"TestPass123!\",
    \"name\": \"Test User\",
    \"phone\": \"+1234567890\"
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract OTP
OTP_CODE=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('otp', {}).get('code', ''))" 2>/dev/null)
NEW_USER_EMAIL=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('user', {}).get('email', ''))" 2>/dev/null)

if [ -z "$OTP_CODE" ]; then
  OTP_CODE=$(echo "$REGISTER_RESPONSE" | grep -o '"code":"[^"]*' | cut -d'"' -f4)
  NEW_USER_EMAIL="testuser${TIMESTAMP}@example.com"
fi

echo -e "\n${GREEN}OTP Code: $OTP_CODE${NC}"
echo -e "${GREEN}New User Email: $NEW_USER_EMAIL${NC}\n"

# 5. Verify Email (if OTP available)
if [ ! -z "$OTP_CODE" ] && [ ! -z "$NEW_USER_EMAIL" ]; then
  echo -e "${YELLOW}5. Testing Email Verification...${NC}"
  curl -s -X POST "$BASE_URL/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$NEW_USER_EMAIL\",
      \"code\": \"$OTP_CODE\"
    }" | python3 -m json.tool 2>/dev/null || \
  curl -s -X POST "$BASE_URL/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$NEW_USER_EMAIL\",
      \"code\": \"$OTP_CODE\"
    }"
  echo -e "\n"
fi

# 6. Refresh Token (Using cookies)
if [ -f "$COOKIE_JAR" ]; then
  echo -e "${YELLOW}6. Testing Token Refresh (Using Cookies)...${NC}"
  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" | python3 -m json.tool 2>/dev/null || \
  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json"
  echo -e "\n"
fi

# 7. Test Invalid Login
echo -e "${YELLOW}7. Testing Invalid Login (Error Handling)...${NC}"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "WrongPassword"
  }' | python3 -m json.tool 2>/dev/null || \
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "WrongPassword"
  }'
echo -e "\n"

# 8. Forgot Password
echo -e "${YELLOW}8. Testing Forgot Password...${NC}"
curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com"
  }' | python3 -m json.tool 2>/dev/null || \
curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com"
  }'
echo -e "\n"

echo -e "${GREEN}=== Testing Complete ===${NC}"

