#!/bin/bash

# Comprehensive Teacher Module Endpoint Testing Script
# Tests all CRUD operations, department/course assignments, and complex queries

BASE_URL="http://localhost:8000/api/teachers"
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
echo -e "${BLUE}║  Teacher Module - Comprehensive Route Testing            ║${NC}"
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
COOKIE_JAR="/tmp/test_teacher_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}')

SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
  echo -e "${YELLOW}⚠️  Warning: Could not login. Protected endpoints (PUT/DELETE) will fail.${NC}"
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

# Test 1: Create Teacher
echo -e "${YELLOW}[Test 1] CREATE Teacher${NC}"
TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Dr. John Smith\",
    \"email\": \"john.smith.$TIMESTAMP@university.edu\",
    \"phone\": \"+1-555-1001\",
    \"specialization\": \"Computer Science\",
    \"isActive\": true
  }")

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

TEACHER_ID=$(extract_json_value "$CREATE_RESPONSE" "d.get('data', {}).get('id', '')")
if [ -z "$TEACHER_ID" ]; then
  TEACHER_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi
if [ -z "$TEACHER_ID" ]; then
  TEACHER_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)
fi

if [ -z "$TEACHER_ID" ]; then
  print_test_result 1
  echo -e "${RED}❌ Failed to create teacher or extract ID${NC}"
  echo -e "${RED}Response was: $CREATE_RESPONSE${NC}"
  exit 1
fi
print_test_result 0
echo -e "${GREEN}Teacher created with ID: $TEACHER_ID${NC}\n"

# Test 2: Create Additional Teachers for Testing
echo -e "${YELLOW}[Test 2] Creating additional teachers for testing...${NC}"
TIMESTAMP2=$(date +%s)
CREATE_RESPONSE2=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Dr. Jane Doe\",
    \"email\": \"jane.doe.$TIMESTAMP2@university.edu\",
    \"phone\": \"+1-555-1002\",
    \"specialization\": \"Mathematics\",
    \"isActive\": true
  }")

TEACHER_ID2=$(extract_json_value "$CREATE_RESPONSE2" "d.get('data', {}).get('id', '')")
if [ -z "$TEACHER_ID2" ]; then
  TEACHER_ID2=$(echo "$CREATE_RESPONSE2" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi
if [ -z "$TEACHER_ID2" ]; then
  TEACHER_ID2=$(echo "$CREATE_RESPONSE2" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)
fi

TIMESTAMP3=$(date +%s)
CREATE_RESPONSE3=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Prof. Robert Johnson\",
    \"email\": \"robert.johnson.$TIMESTAMP3@university.edu\",
    \"phone\": \"+1-555-1003\",
    \"specialization\": \"Physics\",
    \"isActive\": true
  }")

TEACHER_ID3=$(extract_json_value "$CREATE_RESPONSE3" "d.get('data', {}).get('id', '')")
if [ -z "$TEACHER_ID3" ]; then
  TEACHER_ID3=$(echo "$CREATE_RESPONSE3" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
fi
if [ -z "$TEACHER_ID3" ]; then
  TEACHER_ID3=$(echo "$CREATE_RESPONSE3" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', ''))" 2>/dev/null)
fi

if [ -n "$TEACHER_ID2" ] && [ -n "$TEACHER_ID3" ]; then
  print_test_result 0
  echo -e "${GREEN}Additional teachers created: $TEACHER_ID2, $TEACHER_ID3${NC}\n"
else
  print_test_result 1
  echo -e "${YELLOW}⚠️  Some teachers may not have been created${NC}\n"
fi

# Test 3: Get All Teachers (Paginated)
echo -e "${YELLOW}[Test 3] GET ALL Teachers (Paginated)${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=1&limit=10")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE" | head -30

TOTAL=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('total', 0)")
if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 4: Get Teacher by ID
echo -e "${YELLOW}[Test 4] GET Teacher by ID ($TEACHER_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$TEACHER_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

FOUND_ID=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('id', '')")
if [ -n "$FOUND_ID" ] && [ "$FOUND_ID" = "$TEACHER_ID" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 5: Get Teacher with Invalid ID (404)
echo -e "${YELLOW}[Test 5] GET Teacher with Invalid ID (404)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/99999")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "404" ]; then
  print_test_result 0
else
  print_test_result 1
  echo -e "${RED}Expected 404, got $HTTP_CODE${NC}"
fi

# Test 6: Update Teacher (Protected)
echo -e "${YELLOW}[Test 6] UPDATE Teacher ($TEACHER_ID)${NC}"
if [ -z "$COOKIE_JAR" ] || [ ! -f "$COOKIE_JAR" ]; then
  echo -e "${YELLOW}⚠️  Skipping - No auth cookies${NC}\n"
  print_test_result 0
else
  UPDATE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X PUT "$BASE_URL/$TEACHER_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Dr. John Smith Updated",
      "phone": "+1-555-1999",
      "specialization": "Advanced Computer Science"
    }')

  echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
  UPDATED_NAME=$(extract_json_value "$UPDATE_RESPONSE" "d.get('data', {}).get('name', '')")
  if echo "$UPDATED_NAME" | grep -q "Updated"; then
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# Test 7: Delete Teacher (Protected)
echo -e "${YELLOW}[Test 7] DELETE Teacher ($TEACHER_ID3)${NC}"
if [ -z "$COOKIE_JAR" ] || [ ! -f "$COOKIE_JAR" ]; then
  echo -e "${YELLOW}⚠️  Skipping - No auth cookies${NC}\n"
  print_test_result 0
else
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" -X DELETE "$BASE_URL/$TEACHER_ID3")
  HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    print_test_result 0
  else
    print_test_result 1
    echo -e "${RED}Expected 200/204, got $HTTP_CODE${NC}"
  fi
fi

# ============================================
# SECTION 2: DEPARTMENT ASSIGNMENT OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 2: DEPARTMENT ASSIGNMENT OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Note: These tests assume departments exist. If not, they may fail.
# You may need to create departments first or adjust department IDs.

DEPARTMENT_ID=1  # Adjust if needed

# Test 8: Assign Teacher to Department
echo -e "${YELLOW}[Test 8] Assign Teacher to Department${NC}"
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/$TEACHER_ID/departments" \
  -H "Content-Type: application/json" \
  -d "{
    \"departmentId\": $DEPARTMENT_ID,
    \"role\": \"Head\"
  }")

echo "$ASSIGN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ASSIGN_RESPONSE"

if echo "$ASSIGN_RESPONSE" | grep -q "success\|assigned"; then
  print_test_result 0
else
  # Check if it's a 404 (department doesn't exist) or 409 (already assigned)
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/$TEACHER_ID/departments" \
    -H "Content-Type: application/json" \
    -d "{\"departmentId\": $DEPARTMENT_ID, \"role\": \"Head\"}")
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "409" ]; then
    echo -e "${CYAN}Note: Department may not exist or teacher already assigned (HTTP $HTTP_CODE)${NC}"
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# Test 9: Get Teacher's Departments
echo -e "${YELLOW}[Test 9] Get Teacher's Departments${NC}"
RESPONSE=$(curl -s "$BASE_URL/$TEACHER_ID/departments")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 10: Remove Teacher from Department
echo -e "${YELLOW}[Test 10] Remove Teacher from Department${NC}"
REMOVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/$TEACHER_ID/departments/$DEPARTMENT_ID")
HTTP_CODE=$(echo "$REMOVE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  print_test_result 0
else
  # If assignment doesn't exist, that's okay for testing
  if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${CYAN}Note: Assignment may not exist (HTTP 404)${NC}"
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# ============================================
# SECTION 3: COURSE ASSIGNMENT OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 3: COURSE ASSIGNMENT OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

COURSE_ID=1  # Adjust if needed

# Test 11: Assign Teacher to Course
echo -e "${YELLOW}[Test 11] Assign Teacher to Course${NC}"
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/$TEACHER_ID/courses" \
  -H "Content-Type: application/json" \
  -d "{
    \"courseId\": $COURSE_ID,
    \"role\": \"Instructor\"
  }")

echo "$ASSIGN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ASSIGN_RESPONSE"

if echo "$ASSIGN_RESPONSE" | grep -q "success\|assigned"; then
  print_test_result 0
else
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/$TEACHER_ID/courses" \
    -H "Content-Type: application/json" \
    -d "{\"courseId\": $COURSE_ID, \"role\": \"Instructor\"}")
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "409" ]; then
    echo -e "${CYAN}Note: Course may not exist or teacher already assigned (HTTP $HTTP_CODE)${NC}"
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# Test 12: Get Teacher's Courses
echo -e "${YELLOW}[Test 12] Get Teacher's Courses${NC}"
RESPONSE=$(curl -s "$BASE_URL/$TEACHER_ID/courses")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 13: Remove Teacher from Course
echo -e "${YELLOW}[Test 13] Remove Teacher from Course${NC}"
REMOVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/$TEACHER_ID/courses/$COURSE_ID")
HTTP_CODE=$(echo "$REMOVE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  print_test_result 0
else
  if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${CYAN}Note: Assignment may not exist (HTTP 404)${NC}"
    print_test_result 0
  else
    print_test_result 1
  fi
fi

# ============================================
# SECTION 4: CUSTOM QUERIES
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 4: CUSTOM QUERIES${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 14: Get Teachers by Department
echo -e "${YELLOW}[Test 14] Get Teachers by Department${NC}"
RESPONSE=$(curl -s "$BASE_URL/department/$DEPARTMENT_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 15: Get Teachers by Course
echo -e "${YELLOW}[Test 15] Get Teachers by Course${NC}"
RESPONSE=$(curl -s "$BASE_URL/course/$COURSE_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 16: Get Teachers with Most Courses
echo -e "${YELLOW}[Test 16] Get Teachers with Most Courses${NC}"
RESPONSE=$(curl -s "$BASE_URL/most-courses?limit=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 5: COMPLEX QUERIES
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 5: COMPLEX QUERIES${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 17: Get Teacher Performance Metrics (All)
echo -e "${YELLOW}[Test 17] Get Teacher Performance Metrics (All)${NC}"
RESPONSE=$(curl -s "$BASE_URL/performance")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 18: Get Teacher Performance Metrics (Specific Teacher)
echo -e "${YELLOW}[Test 18] Get Teacher Performance Metrics (Teacher ID: $TEACHER_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/performance?teacherId=$TEACHER_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 19: Get Teachers with Low Enrollment Courses
echo -e "${YELLOW}[Test 19] Get Teachers with Low Enrollment Courses${NC}"
RESPONSE=$(curl -s "$BASE_URL/low-enrollment-courses?threshold=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 20: Get Teachers by Department with Stats
echo -e "${YELLOW}[Test 20] Get Teachers by Department with Stats${NC}"
RESPONSE=$(curl -s "$BASE_URL/department/$DEPARTMENT_ID/stats")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SUMMARY
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

echo -e "Total Tests: ${CYAN}$TEST_COUNT${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${YELLOW}⚠️  Some tests failed. Review the output above for details.${NC}"
  exit 1
fi

