#!/bin/bash
total=0
files=(
"build-neat/references/sample/07-sequelize/src/users/users.service.ts"
"build-neat/references/sample/07-sequelize/src/users/users.service.spec.ts"
"build-neat/references/sample/07-sequelize/src/users/users.module.ts"
"build-neat/references/sample/07-sequelize/src/users/models/user.model.ts"
"build-neat/references/sample/07-sequelize/src/app.module.ts"
"src/modules/user/user.repository.ts"
"src/modules/user/user.module.ts"
"src/modules/teacher/teacher.repository.ts"
"src/modules/teacher/teacher.module.ts"
"src/modules/student/student.service.ts"
"src/modules/student/student.repository.ts"
"src/modules/student/student.module.ts"
"src/modules/product/product.repository.ts"
"src/modules/product/product.module.ts"
"src/modules/department/department.repository.ts"
"src/modules/department/department.module.ts"
"src/modules/course/course.repository.ts"
"src/modules/course/course.module.ts"
"src/modules/auth/auth.repository.ts"
"src/modules/auth/auth.module.ts"
"src/database/utils/transaction.util.ts"
"src/database/models/user.model.ts"
"src/database/models/user-role.model.ts"
"src/database/models/teacher.model.ts"
"src/database/models/teacher-department.model.ts"
"src/database/models/student.model.ts"
"src/database/models/social-auth.model.ts"
"src/database/models/seller.model.ts"
"src/database/models/role.model.ts"
"src/database/models/product.model.ts"
"src/database/models/otp.model.ts"
"src/database/models/enrollment.model.ts"
"src/database/models/department.model.ts"
"src/database/models/course.model.ts"
"src/database/models/course-teacher.model.ts"
"src/database/examples/query-examples.ts"
"src/database/database.module.ts"
"src/config/database.config.ts"
"src/common/utils/date.util.ts"
"src/common/bootstrap/app-shutdown.handler.ts"
"src/app.service.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        total=$((total + lines))
    fi
done

echo "Total Sequelize lines: $total"
