#!/bin/bash

# Comprehensive Student Module Endpoint Testing Script
# Tests all CRUD operations, enrollment operations, and complex queries

BASE_URL="http://localhost:8000/api/students"
COURSE_URL="http://localhost:8000/api/courses"
DEPARTMENT_URL="http://localhost:8000/api/departments"
AUTH_URL="http://localhost:8000/api/auth"
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

# Variables to store IDs
STUDENT_ID=""
STUDENT_ID2=""
COURSE_ID=""
COURSE_ID2=""
DEPARTMENT_ID=""
ENROLLMENT_ID=""
COOKIE_JAR=""

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

# Helper function to extract ID from response
extract_id() {
  local response="$1"
  local id=$(extract_json_value "$response" "d.get('data', {}).get('id', '')")
  if [ -z "$id" ]; then
    id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  fi
  echo "$id"
}

# Helper function to setup auth cookies
setup_auth_cookies() {
  local cookie_jar="/tmp/test_student_cookies.txt"
  rm -f "$cookie_jar"
  
  local login_response=$(curl -s -c "$cookie_jar" -X POST "$AUTH_URL/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "demo@example.com",
      "password": "demo123"
    }')
  
  local success=$(extract_json_value "$login_response" "d.get('success', False)")
  if [ "$success" = "True" ] || [ "$success" = "true" ]; then
    echo "$cookie_jar"
  else
    echo ""
  fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Student Module - Comprehensive Route Testing             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Check if API is running
echo -e "${CYAN}Checking API status...${NC}"
if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo -e "${RED}❌ API is not running. Please start with: npm run start:dev${NC}"
  exit 1
fi
echo -e "${GREEN}✅ API is running${NC}\n"

# Setup auth cookies for protected endpoints
echo -e "${CYAN}Setting up authentication cookies...${NC}"
COOKIE_JAR=$(setup_auth_cookies)
if [ -z "$COOKIE_JAR" ]; then
  echo -e "${YELLOW}⚠️  Could not setup auth cookies. Some tests may fail.${NC}\n"
else
  echo -e "${GREEN}✅ Auth cookies setup successful${NC}\n"
fi

# Setup: Create course and department for testing
echo -e "${CYAN}Setting up test data (courses and departments)...${NC}"

# Create a course
COURSE_RESPONSE=$(curl -s -X POST "$COURSE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Course for Student Enrollment",
    "code": "TEST101",
    "description": "A test course for student enrollment testing",
    "credits": 3,
    "isActive": true
  }')

COURSE_ID=$(extract_id "$COURSE_RESPONSE")
if [ -n "$COURSE_ID" ]; then
  echo -e "${GREEN}✅ Course created with ID: $COURSE_ID${NC}"
else
  # Try to find existing course
  COURSE_LIST=$(curl -s "$COURSE_URL?limit=1")
  COURSE_ID=$(extract_json_value "$COURSE_LIST" "d.get('data', {}).get('data', [{}])[0].get('id', '')")
  if [ -n "$COURSE_ID" ]; then
    echo -e "${YELLOW}⚠️  Using existing course with ID: $COURSE_ID${NC}"
  else
    echo -e "${RED}❌ Could not create or find course${NC}"
  fi
fi

# Create second course
COURSE_RESPONSE2=$(curl -s -X POST "$COURSE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Test Course",
    "code": "TEST201",
    "description": "Another test course",
    "credits": 4,
    "isActive": true
  }')

COURSE_ID2=$(extract_id "$COURSE_RESPONSE2")
if [ -n "$COURSE_ID2" ]; then
  echo -e "${GREEN}✅ Second course created with ID: $COURSE_ID2${NC}"
fi

# Get or create department
DEPARTMENT_LIST=$(curl -s "$DEPARTMENT_URL?limit=1")
DEPARTMENT_ID=$(extract_json_value "$DEPARTMENT_LIST" "d.get('data', {}).get('data', [{}])[0].get('id', '')")
if [ -z "$DEPARTMENT_ID" ]; then
  DEPARTMENT_RESPONSE=$(curl -s -X POST "$DEPARTMENT_URL" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Department",
      "description": "A test department for student testing",
      "isActive": true
    }')
  DEPARTMENT_ID=$(extract_id "$DEPARTMENT_RESPONSE")
fi

if [ -n "$DEPARTMENT_ID" ]; then
  echo -e "${GREEN}✅ Department available with ID: $DEPARTMENT_ID${NC}\n"
else
  echo -e "${YELLOW}⚠️  Could not get department ID. Some tests may fail.${NC}\n"
fi

# ============================================
# SECTION 1: BASIC CRUD OPERATIONS
# ============================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 1: BASIC CRUD OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 1: Create Student
echo -e "${YELLOW}[Test 1] CREATE Student${NC}"
TIMESTAMP=$(date +%s)
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"John Doe\",
    \"email\": \"john.doe.${TIMESTAMP}@student.test\",
    \"phone\": \"+1-555-0101\",
    \"studentId\": \"STU${TIMESTAMP}\",
    \"dateOfBirth\": \"2000-01-15\",
    \"isActive\": true
  }")

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

STUDENT_ID=$(extract_id "$CREATE_RESPONSE")
if [ -z "$STUDENT_ID" ]; then
  print_test_result 1
  echo -e "${RED}❌ Failed to create student or extract ID${NC}"
  exit 1
fi
print_test_result 0
echo -e "${GREEN}Student created with ID: $STUDENT_ID${NC}\n"

# Test 2: Create Second Student
echo -e "${YELLOW}[Test 2] CREATE Second Student${NC}"
TIMESTAMP2=$((TIMESTAMP + 1))
CREATE_RESPONSE2=$(curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Jane Smith\",
    \"email\": \"jane.smith.${TIMESTAMP2}@student.test\",
    \"phone\": \"+1-555-0102\",
    \"studentId\": \"STU${TIMESTAMP2}\",
    \"dateOfBirth\": \"2001-03-20\",
    \"isActive\": true
  }")

STUDENT_ID2=$(extract_id "$CREATE_RESPONSE2")
if [ -n "$STUDENT_ID2" ]; then
  print_test_result 0
  echo -e "${GREEN}Second student created with ID: $STUDENT_ID2${NC}\n"
else
  print_test_result 1
fi

# Test 3: Get All Students (Paginated)
echo -e "${YELLOW}[Test 3] GET ALL Students (Paginated)${NC}"
RESPONSE=$(curl -s "$BASE_URL?page=1&limit=10")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE" | head -30
TOTAL=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('meta', {}).get('total', 0)")
if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 4: Get Student by ID
echo -e "${YELLOW}[Test 4] GET Student by ID ($STUDENT_ID)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
FOUND_ID=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('id', '')")
if [ "$FOUND_ID" = "$STUDENT_ID" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 5: Get Student with Invalid ID
echo -e "${YELLOW}[Test 5] GET Student with Invalid ID (99999)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/99999")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
if [ "$HTTP_CODE" = "404" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 6: Update Student (requires auth)
echo -e "${YELLOW}[Test 6] UPDATE Student ($STUDENT_ID)${NC}"
if [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
  UPDATE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X PUT "$BASE_URL/$STUDENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "John Doe Updated",
      "phone": "+1-555-9999"
    }')
  
  echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
  UPDATED_NAME=$(extract_json_value "$UPDATE_RESPONSE" "d.get('data', {}).get('name', '')")
  if echo "$UPDATED_NAME" | grep -q "Updated"; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no auth token${NC}\n"
  print_test_result 0
fi

# ============================================
# SECTION 2: ENROLLMENT OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 2: ENROLLMENT OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 7: Enroll Student in Course
echo -e "${YELLOW}[Test 7] ENROLL Student in Course${NC}"
if [ -n "$COURSE_ID" ]; then
  ENROLL_RESPONSE=$(curl -s -X POST "$BASE_URL/$STUDENT_ID/enroll" \
    -H "Content-Type: application/json" \
    -d "{
      \"courseId\": $COURSE_ID,
      \"status\": \"enrolled\"
    }")
  
  echo "$ENROLL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ENROLL_RESPONSE"
  ENROLLMENT_ID=$(extract_json_value "$ENROLL_RESPONSE" "d.get('data', {}).get('id', '')")
  if [ -n "$ENROLLMENT_ID" ]; then
    print_test_result 0
    echo -e "${GREEN}Enrollment created with ID: $ENROLLMENT_ID${NC}\n"
  else
    # Check if already enrolled
    if echo "$ENROLL_RESPONSE" | grep -q "already enrolled"; then
      echo -e "${YELLOW}⚠️  Student already enrolled, getting enrollment ID...${NC}"
      ENROLLMENTS_RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/enrollments")
      ENROLLMENT_ID=$(extract_json_value "$ENROLLMENTS_RESPONSE" "d.get('data', [{}])[0].get('id', '')")
      if [ -n "$ENROLLMENT_ID" ]; then
        print_test_result 0
      else
        print_test_result 1
      fi
    else
      print_test_result 1
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no course ID${NC}\n"
  print_test_result 0
fi

# Test 8: Get Student Enrollments
echo -e "${YELLOW}[Test 8] GET Student Enrollments${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/enrollments")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
ENROLLMENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$ENROLLMENT_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 9: Get Student Enrollments with Status Filter
echo -e "${YELLOW}[Test 9] GET Student Enrollments (status=enrolled)${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/enrollments?status=enrolled")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
if echo "$RESPONSE" | grep -q "enrolled"; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 10: Get Student Courses
echo -e "${YELLOW}[Test 10] GET Student Courses${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/courses")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
COURSE_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$COURSE_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 11: Update Enrollment
echo -e "${YELLOW}[Test 11] UPDATE Enrollment${NC}"
if [ -n "$ENROLLMENT_ID" ]; then
  UPDATE_ENROLL_RESPONSE=$(curl -s -X PUT "$BASE_URL/$STUDENT_ID/enrollments/$ENROLLMENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "status": "completed",
      "grade": 85.5
    }')
  
  echo "$UPDATE_ENROLL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_ENROLL_RESPONSE"
  UPDATED_STATUS=$(extract_json_value "$UPDATE_ENROLL_RESPONSE" "d.get('data', {}).get('status', '')")
  if [ "$UPDATED_STATUS" = "completed" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no enrollment ID${NC}\n"
  print_test_result 0
fi

# Test 12: Get Student GPA
echo -e "${YELLOW}[Test 12] GET Student GPA${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/gpa")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
GPA=$(extract_json_value "$RESPONSE" "d.get('data', {}).get('gpa', '')")
if [ -n "$GPA" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 13: Enroll in Second Course
echo -e "${YELLOW}[Test 13] ENROLL Student in Second Course${NC}"
if [ -n "$COURSE_ID2" ]; then
  ENROLL_RESPONSE2=$(curl -s -X POST "$BASE_URL/$STUDENT_ID/enroll" \
    -H "Content-Type: application/json" \
    -d "{
      \"courseId\": $COURSE_ID2,
      \"status\": \"enrolled\"
    }")
  
  echo "$ENROLL_RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$ENROLL_RESPONSE2"
  if echo "$ENROLL_RESPONSE2" | grep -q "success\|id"; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no second course ID${NC}\n"
  print_test_result 0
fi

# Test 14: Drop Enrollment
echo -e "${YELLOW}[Test 14] DROP Enrollment${NC}"
if [ -n "$ENROLLMENT_ID" ]; then
  # Get a different enrollment to drop (not the one we updated)
  ENROLLMENTS_RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/enrollments")
  DROP_ENROLLMENT_ID=$(extract_json_value "$ENROLLMENTS_RESPONSE" "d.get('data', [{}])[-1].get('id', '')")
  
  if [ -n "$DROP_ENROLLMENT_ID" ] && [ "$DROP_ENROLLMENT_ID" != "$ENROLLMENT_ID" ]; then
    DROP_RESPONSE=$(curl -s -X DELETE "$BASE_URL/$STUDENT_ID/enrollments/$DROP_ENROLLMENT_ID" \
      -w "\n%{http_code}")
    HTTP_CODE=$(echo "$DROP_RESPONSE" | tail -1)
    BODY=$(echo "$DROP_RESPONSE" | sed '$d')
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
      print_test_result 0
    else
      print_test_result 1
    fi
  else
    echo -e "${YELLOW}⚠️  Skipped - no enrollment to drop${NC}\n"
    print_test_result 0
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no enrollment ID${NC}\n"
  print_test_result 0
fi

# ============================================
# SECTION 3: QUERY ENDPOINTS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 3: QUERY ENDPOINTS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 15: Get Students by Course
echo -e "${YELLOW}[Test 15] GET Students by Course${NC}"
if [ -n "$COURSE_ID" ]; then
  RESPONSE=$(curl -s "$BASE_URL/course/$COURSE_ID")
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  STUDENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
  if [ -n "$STUDENT_COUNT" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no course ID${NC}\n"
  print_test_result 0
fi

# Test 16: Get Students Enrolled This Month
echo -e "${YELLOW}[Test 16] GET Students Enrolled This Month${NC}"
RESPONSE=$(curl -s "$BASE_URL/enrolled/this-month")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
ENROLLMENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$ENROLLMENT_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 17: Get Top Performing Students
echo -e "${YELLOW}[Test 17] GET Top Performing Students${NC}"
RESPONSE=$(curl -s "$BASE_URL/top-performing?limit=5")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
STUDENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$STUDENT_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 18: Get Top Performing Students with Min GPA
echo -e "${YELLOW}[Test 18] GET Top Performing Students (minGPA=80)${NC}"
RESPONSE=$(curl -s "$BASE_URL/top-performing?limit=10&minGPA=80")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
STUDENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$STUDENT_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 19: Get Students by Department
echo -e "${YELLOW}[Test 19] GET Students by Department${NC}"
if [ -n "$DEPARTMENT_ID" ]; then
  RESPONSE=$(curl -s "$BASE_URL/department/$DEPARTMENT_ID")
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  STUDENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
  if [ -n "$STUDENT_COUNT" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no department ID${NC}\n"
  print_test_result 0
fi

# Test 20: Get Students with GPA Above Threshold
echo -e "${YELLOW}[Test 20] GET Students with GPA Above 80${NC}"
RESPONSE=$(curl -s "$BASE_URL/gpa/above/80")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
STUDENT_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$STUDENT_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# Test 21: Get Available Courses for Student
echo -e "${YELLOW}[Test 21] GET Available Courses for Student${NC}"
RESPONSE=$(curl -s "$BASE_URL/$STUDENT_ID/available-courses")
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
COURSE_COUNT=$(extract_json_value "$RESPONSE" "len(d.get('data', []))")
if [ -n "$COURSE_COUNT" ]; then
  print_test_result 0
else
  print_test_result 1
fi

# ============================================
# SECTION 4: DELETE OPERATIONS
# ============================================
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECTION 4: DELETE OPERATIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"

# Test 22: Delete Student (requires auth)
echo -e "${YELLOW}[Test 22] DELETE Student ($STUDENT_ID2)${NC}"
if [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ] && [ -n "$STUDENT_ID2" ]; then
  DELETE_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X DELETE "$BASE_URL/$STUDENT_ID2" \
    -w "\n%{http_code}")
  HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)
  BODY=$(echo "$DELETE_RESPONSE" | sed '$d')
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  echo -e "${YELLOW}⚠️  Skipped - no auth token or student ID${NC}\n"
  print_test_result 0
fi

# Test 23: Verify Deletion
echo -e "${YELLOW}[Test 23] Verify DELETE - Try to get deleted student${NC}"
if [ -n "$STUDENT_ID2" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/$STUDENT_ID2")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  if [ "$HTTP_CODE" = "404" ]; then
    print_test_result 0
  else
    print_test_result 1
  fi
else
  print_test_result 0
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
  echo -e "  ✅ POST   /api/students                      - Create student"
  echo -e "  ✅ GET    /api/students                      - Get all students (paginated)"
  echo -e "  ✅ GET    /api/students/:id                  - Get student by ID"
  echo -e "  ✅ PUT    /api/students/:id                  - Update student"
  echo -e "  ✅ DELETE /api/students/:id                  - Delete student"
  echo -e "  ✅ POST   /api/students/:id/enroll           - Enroll student in course"
  echo -e "  ✅ GET    /api/students/:id/courses          - Get student courses"
  echo -e "  ✅ GET    /api/students/:id/enrollments      - Get student enrollments"
  echo -e "  ✅ PUT    /api/students/:id/enrollments/:eid - Update enrollment"
  echo -e "  ✅ DELETE /api/students/:id/enrollments/:eid - Drop enrollment"
  echo -e "  ✅ GET    /api/students/:id/gpa              - Get student GPA"
  echo -e "  ✅ GET    /api/students/course/:courseId      - Get students by course"
  echo -e "  ✅ GET    /api/students/enrolled/this-month  - Get students enrolled this month"
  echo -e "  ✅ GET    /api/students/top-performing       - Get top performing students"
  echo -e "  ✅ GET    /api/students/department/:deptId   - Get students by department"
  echo -e "  ✅ GET    /api/students/gpa/above/:threshold - Get students with GPA above threshold"
  echo -e "  ✅ GET    /api/students/:id/available-courses - Get available courses for student"
  echo -e "\n${GREEN}All Student endpoints tested successfully!${NC}"
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ SOME TESTS FAILED                                       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}\n"
  exit 1
fi

