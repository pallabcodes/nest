#!/bin/bash

BASE_URL="http://localhost:8000/api"
TOKEN_FILE="/tmp/test_token.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
FAILED_TESTS=()

# Setup authentication cookies for protected endpoints
echo -e "${YELLOW}Setting up authentication cookies...${NC}"
COOKIE_JAR="/tmp/test_course_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}')

SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
  echo -e "${YELLOW}⚠ Warning: Could not login. Protected endpoints will fail.${NC}"
  rm -f "$COOKIE_JAR"
  COOKIE_JAR=""
else
  echo -e "${GREEN}✓ Auth cookies setup successful${NC}"
fi
echo ""

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  local expected_code=${5:-200}
  local requires_auth=${6:-false}
  
  echo -n "Testing $description... "
  
  local cookie_flag=""
  if [ "$requires_auth" = "true" ] && [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
    cookie_flag="-b $COOKIE_JAR"
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X GET "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X POST "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X PUT "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X DELETE "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}✗${NC} (HTTP $http_code, expected $expected_code)"
    echo -e "  ${YELLOW}Response:${NC} $(echo "$body" | head -c 300)"
    echo ""
    return 1
  fi
}

# Extract ID from response
extract_id() {
  local response=$1
  echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', '') or data.get('id', ''))" 2>/dev/null
}

echo "=========================================="
echo "Testing Course Endpoints"
echo "=========================================="
echo ""

# Check if server is running
echo -n "Checking if server is running... "
if ! curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
  echo -e "${RED}✗${NC}"
  echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
  echo "Please start the server with: npm run start:dev"
  exit 1
fi
echo -e "${GREEN}✓${NC}"
echo ""

# Store created course IDs for cleanup
CREATED_IDS=()

# ============================================
# 1. CREATE COURSE (POST /courses)
# ============================================
echo -e "${BLUE}=== CREATE COURSE ===${NC}"

TIMESTAMP=$(date +%s)
COURSE_NAME="Test Course ${TIMESTAMP}"

# Test 1.1: Create course with all fields
test_endpoint "POST" "/courses" "{\"name\":\"${COURSE_NAME}\",\"code\":\"CS${TIMESTAMP}\",\"description\":\"Test course description\",\"credits\":3,\"isActive\":true}" "POST /courses (create with all fields)" 201
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/courses" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${COURSE_NAME}2\",\"code\":\"CS${TIMESTAMP}2\",\"description\":\"Test\",\"credits\":4,\"isActive\":true}")
  COURSE_ID=$(extract_id "$CREATE_RESPONSE")
  if [ -n "$COURSE_ID" ]; then
    CREATED_IDS+=("$COURSE_ID")
  fi
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /courses (all fields)")
fi

# Test 1.2: Create course with minimal required fields
test_endpoint "POST" "/courses" "{\"name\":\"Minimal Course ${TIMESTAMP}\"}" "POST /courses (create with minimal fields)" 201
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /courses (minimal)"); }

# Test 1.3: Create course - validation error (empty name)
test_endpoint "POST" "/courses" "{\"name\":\"\"}" "POST /courses (empty name - should fail)" 500
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /courses (validation)"); }

echo ""

# ============================================
# 2. GET ALL COURSES (GET /courses)
# ============================================
echo -e "${BLUE}=== GET ALL COURSES ===${NC}"

# Test 2.1: Get all courses (default pagination)
test_endpoint "GET" "/courses" "" "GET /courses (list all - default)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses (default)"); }

# Test 2.2: Get all courses with pagination
test_endpoint "GET" "/courses?page=1&limit=5" "" "GET /courses (with pagination)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses (pagination)"); }

# Test 2.3: Get all courses with name filter
test_endpoint "GET" "/courses?name=Test" "" "GET /courses (filter by name)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses (name filter)"); }

# Test 2.4: Get all courses with code filter
test_endpoint "GET" "/courses?code=CS" "" "GET /courses (filter by code)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses (code filter)"); }

# Test 2.5: Get all courses with isActive filter
test_endpoint "GET" "/courses?isActive=true" "" "GET /courses (isActive filter)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses (isActive filter)"); }

echo ""

# ============================================
# 3. GET COURSE BY ID (GET /courses/:id)
# ============================================
echo -e "${BLUE}=== GET COURSE BY ID ===${NC}"

# First, get a course ID to test with
GET_ALL_RESPONSE=$(curl -s -X GET "${BASE_URL}/courses?limit=1")
TEST_COURSE_ID=$(echo "$GET_ALL_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)

if [ -z "$TEST_COURSE_ID" ]; then
  # Create a course if none exists
  CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/courses" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Course for GET ${TIMESTAMP}\",\"code\":\"GET${TIMESTAMP}\"}")
  TEST_COURSE_ID=$(extract_id "$CREATE_RESPONSE")
  if [ -n "$TEST_COURSE_ID" ]; then
    CREATED_IDS+=("$TEST_COURSE_ID")
  fi
fi

if [ -n "$TEST_COURSE_ID" ]; then
  # Test 3.1: Get course by valid ID
  test_endpoint "GET" "/courses/${TEST_COURSE_ID}" "" "GET /courses/:id (valid ID)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id (valid)"); }
else
  echo -e "${RED}✗${NC} Could not get/create a course ID for testing"
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("GET /courses/:id (setup)")
fi

# Test 3.2: Get course by invalid ID (non-existent)
test_endpoint "GET" "/courses/999999" "" "GET /courses/:id (non-existent ID)" 404
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id (404)"); }

# Test 3.3: Get course by invalid ID format
test_endpoint "GET" "/courses/invalid" "" "GET /courses/:id (invalid format)" 400
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id (invalid format)"); }

echo ""

# ============================================
# 4. UPDATE COURSE (PUT /courses/:id) - Requires Auth
# ============================================
echo -e "${BLUE}=== UPDATE COURSE ===${NC}"

if [ -n "$TEST_COURSE_ID" ] && [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
  # Test 4.1: Update course with all fields
  test_endpoint "PUT" "/courses/${TEST_COURSE_ID}" "{\"name\":\"Updated Course ${TIMESTAMP}\",\"code\":\"UPD${TIMESTAMP}\",\"description\":\"Updated description\",\"credits\":5,\"isActive\":true}" "PUT /courses/:id (update all fields)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /courses/:id (all fields)"); }

  # Test 4.2: Update course with partial fields
  test_endpoint "PUT" "/courses/${TEST_COURSE_ID}" "{\"name\":\"Partially Updated Course ${TIMESTAMP}\"}" "PUT /courses/:id (partial update)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /courses/:id (partial)"); }

  # Test 4.3: Update course credits only
  test_endpoint "PUT" "/courses/${TEST_COURSE_ID}" "{\"credits\":6}" "PUT /courses/:id (update credits only)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /courses/:id (credits)"); }
else
  echo -e "${YELLOW}⚠${NC} Skipping update tests - no course ID or auth cookies available"
  FAILED=$((FAILED + 3))
  FAILED_TESTS+=("PUT /courses/:id (setup)")
fi

# Test 4.4: Update non-existent course
if [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
  test_endpoint "PUT" "/courses/999999" "{\"name\":\"Non-existent\"}" "PUT /courses/:id (non-existent)" 404 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /courses/:id (404)"); }
fi

echo ""

# ============================================
# 5. DELETE COURSE (DELETE /courses/:id) - Requires Auth
# ============================================
echo -e "${BLUE}=== DELETE COURSE ===${NC}"

# Create a course specifically for deletion
if [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
  DELETE_COURSE_RESPONSE=$(curl -s -X POST "${BASE_URL}/courses" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Course to Delete ${TIMESTAMP}\",\"code\":\"DEL${TIMESTAMP}\"}")
  DELETE_COURSE_ID=$(extract_id "$DELETE_COURSE_RESPONSE")

  if [ -n "$DELETE_COURSE_ID" ]; then
    # Test 5.1: Delete course by valid ID
    test_endpoint "DELETE" "/courses/${DELETE_COURSE_ID}" "" "DELETE /courses/:id (valid ID)" 204 true
    [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /courses/:id (valid)"); }

    # Test 5.2: Try to delete already deleted course
    test_endpoint "DELETE" "/courses/${DELETE_COURSE_ID}" "" "DELETE /courses/:id (already deleted)" 404 true
    [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /courses/:id (404)"); }
  else
    echo -e "${RED}✗${NC} Could not create course for deletion test"
    FAILED=$((FAILED + 2))
    FAILED_TESTS+=("DELETE /courses/:id (setup)")
  fi

  # Test 5.3: Delete non-existent course
  test_endpoint "DELETE" "/courses/999999" "" "DELETE /courses/:id (non-existent)" 404 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /courses/:id (404)"); }
else
  echo -e "${YELLOW}⚠${NC} Skipping delete tests - no auth cookies available"
  FAILED=$((FAILED + 3))
  FAILED_TESTS+=("DELETE /courses/:id (no auth)")
fi

echo ""

# ============================================
# 6. RELATIONSHIP ENDPOINTS
# ============================================
echo -e "${BLUE}=== RELATIONSHIP ENDPOINTS ===${NC}"

if [ -n "$TEST_COURSE_ID" ]; then
  # Test 6.1: Get students enrolled in course
  test_endpoint "GET" "/courses/${TEST_COURSE_ID}/students" "" "GET /courses/:id/students"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id/students"); }

  # Test 6.2: Get teachers assigned to course
  test_endpoint "GET" "/courses/${TEST_COURSE_ID}/teachers" "" "GET /courses/:id/teachers"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id/teachers"); }

  # Test 6.3: Get course enrollments
  test_endpoint "GET" "/courses/${TEST_COURSE_ID}/enrollments" "" "GET /courses/:id/enrollments"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id/enrollments"); }

  # Test 6.4: Get course statistics
  test_endpoint "GET" "/courses/${TEST_COURSE_ID}/statistics" "" "GET /courses/:id/statistics"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/:id/statistics"); }
else
  echo -e "${YELLOW}⚠${NC} Skipping relationship tests - no course ID available"
  FAILED=$((FAILED + 4))
  FAILED_TESTS+=("Relationship endpoints (setup)")
fi

echo ""

# ============================================
# 7. CUSTOM QUERY ENDPOINTS
# ============================================
echo -e "${BLUE}=== CUSTOM QUERY ENDPOINTS ===${NC}"

# Test 7.1: Get courses by teacher
# First get a teacher ID
TEACHER_RESPONSE=$(curl -s -X GET "${BASE_URL}/teacher?limit=1")
TEACHER_ID=$(echo "$TEACHER_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '1')" 2>/dev/null)
TEACHER_ID=${TEACHER_ID:-1}

test_endpoint "GET" "/courses/teacher/${TEACHER_ID}" "" "GET /courses/teacher/:teacherId"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/teacher/:teacherId"); }

# Test 7.2: Get courses with most enrollments
test_endpoint "GET" "/courses/most-enrollments?limit=5" "" "GET /courses/most-enrollments"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/most-enrollments"); }

# Test 7.3: Get courses added this month
test_endpoint "GET" "/courses/added/this-month" "" "GET /courses/added/this-month"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/added/this-month"); }

echo ""

# ============================================
# 8. COMPLEX QUERY ENDPOINTS
# ============================================
echo -e "${BLUE}=== COMPLEX QUERY ENDPOINTS ===${NC}"

# Test 8.1: Get courses by average grade
test_endpoint "GET" "/courses/average-grade/70?above=true" "" "GET /courses/average-grade/:threshold"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/average-grade/:threshold"); }

# Test 8.2: Get courses by department
# First get a department ID
DEPT_RESPONSE=$(curl -s -X GET "${BASE_URL}/department?limit=1")
DEPT_ID=$(echo "$DEPT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '1')" 2>/dev/null)
DEPT_ID=${DEPT_ID:-1}

test_endpoint "GET" "/courses/department/${DEPT_ID}" "" "GET /courses/department/:departmentId"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/department/:departmentId"); }

# Test 8.3: Get courses by completion rate
test_endpoint "GET" "/courses/completion-rate/50" "" "GET /courses/completion-rate/:threshold"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/completion-rate/:threshold"); }

# Test 8.4: Get courses with low enrollment
test_endpoint "GET" "/courses/low-enrollment?threshold=5" "" "GET /courses/low-enrollment"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/low-enrollment"); }

# Test 8.5: Get enrollment trends
test_endpoint "GET" "/courses/enrollment-trends?months=6" "" "GET /courses/enrollment-trends"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /courses/enrollment-trends"); }

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  exit 1
else
  echo -e "${GREEN}All tests passed! ✓${NC}"
  echo ""
  exit 0
fi

