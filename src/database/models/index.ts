// Central export point for all models to avoid circular dependencies
// This pattern ensures models are imported consistently across the application
export { User } from './user.model';
export { Role } from './role.model';
export { UserRole } from './user-role.model';
export { Otp, OtpType } from './otp.model';
