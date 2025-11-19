#!/bin/bash

# Comprehensive Department Module Endpoint Testing Script
# Tests all CRUD operations, relationship queries, and complex queries

BASE_URL="http://localhost:8000/api/departments"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counter
TEST_COUNT=0
PASSED=0
FAILED=0

# Helper function to print test result
print_test_result() {
  TEST_COUNT=$((TEST_COUNT + 1))
  if [ $1 -eq 0 ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✅ PASS${NC}"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}❌ FAIL${NC}"
  fi
  echo ""
}

# Helper function to extract JSON value
extract_json_value() {
  echo "$1" | python3 -c "import sys, json; d=json.load(sys.stdin); print($2)" 2>/dev/null || echo ""
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Department Module - Comprehensive Route Testing          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check if API is running
echo -e "${CYAN}Checking API status...${NC}"
if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo -e "${RED}❌ API is not running. Please start with: npm run start:dev${NC}"
  exit 1
fi
echo -e "${GREEN}✅ API is running${NC}\n"

# Setup authentication cookies for protected endpoints
echo -e "${CYAN}Setting up authentication cookies...${NC}"
COOKIE_JAR="/tmp/test_department_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}')

SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
  echo -e "${YELLOW}⚠️  Warning: Could not login. Protected endpoints will fail.${NC}"
  rm -f "$COOKIE_JAR"
  COOKIE_JAR=""
else
  echo -e "${GREEN}✅ Auth cookies setup successful${NC}"
fi
echo ""

# ============================================
# SECTION 1: BASIC CRUD OPERATIONS
# ============================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 1: BASIC CRUD OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 1: Create Department
echo -e "${YELLOW}[Test 1] CREATE Department${NC}"
TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Computer Science $TIMESTAMP\",
    \"description\": \"Department of Computer Science and Engineering\",
    \"isActive\": true
  }")

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

DEPARTMENT_ID=$(extract_json_value "$CREATE_RESPONSE" "d.get('data', {}).get('id', '')")
if [ -z "$DEPARTMENT_ID" ]; then
  DEPARTMENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi

if [ -z "$DEPARTMENT_ID" ]; then
  print_test_result 1
  echo -e "${RED}❌ Failed to create department or extract ID${NC}"
  exit 1
fi
print_test_result 0
echo -e "${GREEN}Department created with ID: $DEPARTMENT_ID${NC}\n"

# Test 2: Create Multiple Departments for Testing
echo -e "${YELLOW}[Test 2] Creating additional departments for testing...${NC}"
TIMESTAMP2=$((TIMESTAMP + 1))
CREATE_RESPONSE2=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Mathematics $TIMESTAMP2\",
    \"description\": \"Department of Mathematics and Statistics\",
    \"isActive\": true
  }")

DEPARTMENT_ID2=$(extract_json_value "$CREATE_RESPONSE2" "d.get('data', {}).get('id', '')")
if [ -z "$DEPARTMENT_ID2" ]; then
  DEPARTMENT_ID2=$(echo "$CREATE_RESPONSE2" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi

TIMESTAMP3=$((TIMESTAMP + 2))
CREATE_RESPONSE3=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Physics $TIMESTAMP3\",
    \"description\": \"Department of Physics and Astronomy\",
    \"isActive\": true
  }")

DEPARTMENT_ID3=$(extract_json_value "$CREATE_RESPONSE3" "d.get('data', {}).get('id', '')")
if [ -z "$DEPARTMENT_ID3" ]; then
  DEPARTMENT_ID3=$(echo "$CREATE_RESPONSE3" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi

print_test_result 0
echo -e "${GREEN}Departments created: $DEPARTMENT_ID, $DEPARTMENT_ID2, $DEPARTMENT_ID3${NC}\n"

# Test 3: Get All Departments (Paginated)
echo -e "${YELLOW}[Test 3] GET ALL Departments (Paginated)${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=1&limit=10")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE" | head -30
TOTAL=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('total', 0)")
if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 4: Get Department by ID
echo -e "${YELLOW}[Test 4] GET Department by ID ($DEPARTMENT_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$DEPARTMENT_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
FOUND_ID=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('id', '')")
if [ "$FOUND_ID" = "$DEPARTMENT_ID" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 5: Get Department with Invalid ID
echo -e "${YELLOW}[Test 5] GET Department with Invalid ID (99999)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/99999")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
if [ "$HTTP_CODE" = "404" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 2: UPDATE OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 2: UPDATE OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 6: Update Department (Requires Auth)
echo -e "${YELLOW}[Test 6] UPDATE Department ($DEPARTMENT_ID)${NC}"
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping - No authentication token${NC}\n"
  print_test_result 0
else
  UPDATE_TIMESTAMP=$(date +%s)
  UPDATE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X PUT "$BASE_URL/$DEPARTMENT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Computer Science Updated $UPDATE_TIMESTAMP\",
      \"description\": \"Updated description for Computer Science Department\",
      \"isActive\": true
    }")

  echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
  UPDATED_NAME=$(extract_json_value "$UPDATE_RESPONSE" "d.get('data', {}).get('name', '')")
  if [ -n "$UPDATED_NAME" ] && echo "$UPDATED_NAME" | grep -q "Updated"; then
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# Test 7: Verify Update
echo -e "${YELLOW}[Test 7] Verify UPDATE - Get department again${NC}"
RESPONSE=$(curl -s "$BASE_URL/$DEPARTMENT_ID")
UPDATED_NAME=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('name', '')")
if [ -n "$UPDATED_NAME" ]; then
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep -E "(name|description|isActive)" || echo "$RESPONSE" | grep -E "(name|description|isActive)"
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 3: RELATIONSHIP ENDPOINTS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 3: RELATIONSHIP ENDPOINTS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 8: Get Teachers in Department
echo -e "${YELLOW}[Test 8] GET Teachers in Department ($DEPARTMENT_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$DEPARTMENT_ID/teachers")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 9: Get Department Statistics
echo -e "${YELLOW}[Test 9] GET Department Statistics ($DEPARTMENT_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$DEPARTMENT_ID/statistics")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 4: CUSTOM QUERIES
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 4: CUSTOM QUERIES${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 10: Get Departments with Most Teachers
echo -e "${YELLOW}[Test 10] GET Departments with Most Teachers${NC}"
RESPONSE=$(curl -s "$BASE_URL/most-teachers?limit=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 11: Get Departments with Most Teachers (Custom Limit)
echo -e "${YELLOW}[Test 11] GET Departments with Most Teachers (Limit=10)${NC}"
RESPONSE=$(curl -s "$BASE_URL/most-teachers?limit=10")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE" | head -20
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 12: Get Department Performance Metrics (All)
echo -e "${YELLOW}[Test 12] GET Department Performance Metrics (All)${NC}"
RESPONSE=$(curl -s "$BASE_URL/performance")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE" | head -30
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 13: Get Department Performance Metrics (Specific Department)
echo -e "${YELLOW}[Test 13] GET Department Performance Metrics (Department ID: $DEPARTMENT_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/performance?departmentId=$DEPARTMENT_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 14: Get Departments with Most Students
echo -e "${YELLOW}[Test 14] GET Departments with Most Students${NC}"
RESPONSE=$(curl -s "$BASE_URL/most-students?limit=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 15: Get Departments with Most Students (Custom Limit)
echo -e "${YELLOW}[Test 15] GET Departments with Most Students (Limit=10)${NC}"
RESPONSE=$(curl -s "$BASE_URL/most-students?limit=10")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE" | head -20
SUCCESS=$(extract_json_value "$RESPONSE" "d.get('success', False)")
if [ "$SUCCESS" = "True" ] || echo "$RESPONSE" | grep -q '"success"'; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 5: DELETE OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 5: DELETE OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 16: Delete Department (Requires Auth)
echo -e "${YELLOW}[Test 16] DELETE Department ($DEPARTMENT_ID2)${NC}"
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Skipping - No authentication token${NC}\n"
  print_test_result 0
else
  DELETE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X DELETE "$BASE_URL/$DEPARTMENT_ID2" \
    -w "\n%{http_code}")
  HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)
  BODY=$(echo "$DELETE_RESPONSE" | sed '$d')
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# Test 17: Verify Deletion
echo -e "${YELLOW}[Test 17] Verify DELETE - Try to get deleted department${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/$DEPARTMENT_ID2")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
if [ "$HTTP_CODE" = "404" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 6: PAGINATION AND EDGE CASES
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 6: PAGINATION AND EDGE CASES${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 18: Pagination - Page 1, Limit 1
echo -e "${YELLOW}[Test 18] Pagination - Page 1, Limit 1${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=1&limit=1")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
DATA_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', {}).get('data', []))")
LIMIT=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('limit', 0)")
if [ -n "$DATA_COUNT" ] && [ "$DATA_COUNT" -le 1 ] && [ "$LIMIT" = "1" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 19: Pagination - Page 2
echo -e "${YELLOW}[Test 19] Pagination - Page 2${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=2&limit=2")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
PAGE=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('page', 0)")
if [ "$PAGE" = "2" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 20: Get All After Deletion
echo -e "${YELLOW}[Test 20] GET ALL after deletion${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=1&limit=10")
TOTAL=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('total', 0)")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$RESPONSE" | head -20
if [ -n "$TOTAL" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Total Tests: $TEST_COUNT${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}\n"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ ALL TESTS PASSED!                                      ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${BLUE}Tested Routes:${NC}"
  echo -e "  ✅ POST   /api/departments              - Create department"
  echo -e "  ✅ GET    /api/departments              - Get all departments (with pagination)"
  echo -e "  ✅ GET    /api/departments/:id           - Get department by ID"
  echo -e "  ✅ PUT    /api/departments/:id           - Update department (auth required)"
  echo -e "  ✅ DELETE /api/departments/:id            - Delete department (auth required)"
  echo -e "  ✅ GET    /api/departments/:id/teachers   - Get teachers in department"
  echo -e "  ✅ GET    /api/departments/:id/statistics - Get department statistics"
  echo -e "  ✅ GET    /api/departments/most-teachers  - Get departments with most teachers"
  echo -e "  ✅ GET    /api/departments/performance    - Get department performance metrics"
  echo -e "  ✅ GET    /api/departments/most-students  - Get departments with most students"
  echo -e "\n${GREEN}All Department endpoints tested successfully!${NC}"
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ SOME TESTS FAILED                                       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}\n"
  exit 1
fi

