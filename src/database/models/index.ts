// Central export point for all models to avoid circular dependencies
// This pattern ensures models are imported consistently across the application
export { User } from './user.model';
export { Role } from './role.model';
export { UserRole } from './user-role.model';
export { Otp, OtpType } from './otp.model';
export { SocialAuth, SocialProvider } from './social-auth.model';
export { Product } from './product.model';
export { Seller } from './seller.model';
export { Department } from './department.model';
export { Teacher } from './teacher.model';
export { Student } from './student.model';
export { Course } from './course.model';
export { Enrollment } from './enrollment.model';
export { TeacherDepartment } from './teacher-department.model';
export { CourseTeacher } from './course-teacher.model';

