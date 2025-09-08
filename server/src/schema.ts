import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['student', 'teacher', 'administrator']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: userRoleSchema.optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Course schema
export const courseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  teacher_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Input schema for creating courses
export const createCourseInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  teacher_id: z.number()
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

// Input schema for updating courses
export const updateCourseInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  teacher_id: z.number().optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

// Enrollment schema
export const enrollmentSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  course_id: z.number(),
  enrolled_at: z.coerce.date()
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

// Input schema for creating enrollments
export const createEnrollmentInputSchema = z.object({
  student_id: z.number(),
  course_id: z.number()
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentInputSchema>;

// Course material schema
export const courseMaterialSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  file_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CourseMaterial = z.infer<typeof courseMaterialSchema>;

// Input schema for creating course materials
export const createCourseMaterialInputSchema = z.object({
  course_id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  file_url: z.string().nullable()
});

export type CreateCourseMaterialInput = z.infer<typeof createCourseMaterialInputSchema>;

// Input schema for updating course materials
export const updateCourseMaterialInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  content: z.string().nullable().optional(),
  file_url: z.string().nullable().optional()
});

export type UpdateCourseMaterialInput = z.infer<typeof updateCourseMaterialInputSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Assignment = z.infer<typeof assignmentSchema>;

// Input schema for creating assignments
export const createAssignmentInputSchema = z.object({
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  due_date: z.coerce.date().nullable()
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

// Input schema for updating assignments
export const updateAssignmentInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentInputSchema>;

// Assignment submission schema
export const assignmentSubmissionSchema = z.object({
  id: z.number(),
  assignment_id: z.number(),
  student_id: z.number(),
  content: z.string().nullable(),
  file_url: z.string().nullable(),
  submitted_at: z.coerce.date(),
  grade: z.number().nullable(),
  graded_at: z.coerce.date().nullable()
});

export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;

// Input schema for creating assignment submissions
export const createAssignmentSubmissionInputSchema = z.object({
  assignment_id: z.number(),
  student_id: z.number(),
  content: z.string().nullable(),
  file_url: z.string().nullable()
});

export type CreateAssignmentSubmissionInput = z.infer<typeof createAssignmentSubmissionInputSchema>;

// Input schema for grading submissions
export const gradeSubmissionInputSchema = z.object({
  id: z.number(),
  grade: z.number()
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionInputSchema>;

// Query input schemas for filtering and pagination
export const getUsersInputSchema = z.object({
  role: userRoleSchema.optional()
});

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;

export const getCoursesByTeacherInputSchema = z.object({
  teacher_id: z.number()
});

export type GetCoursesByTeacherInput = z.infer<typeof getCoursesByTeacherInputSchema>;

export const getCoursesByStudentInputSchema = z.object({
  student_id: z.number()
});

export type GetCoursesByStudentInput = z.infer<typeof getCoursesByStudentInputSchema>;

export const getCourseMaterialsInputSchema = z.object({
  course_id: z.number()
});

export type GetCourseMaterialsInput = z.infer<typeof getCourseMaterialsInputSchema>;

export const getAssignmentsInputSchema = z.object({
  course_id: z.number()
});

export type GetAssignmentsInput = z.infer<typeof getAssignmentsInputSchema>;

export const getSubmissionsInputSchema = z.object({
  assignment_id: z.number()
});

export type GetSubmissionsInput = z.infer<typeof getSubmissionsInputSchema>;

export const getStudentSubmissionsInputSchema = z.object({
  student_id: z.number()
});

export type GetStudentSubmissionsInput = z.infer<typeof getStudentSubmissionsInputSchema>;

export const getCourseStudentsInputSchema = z.object({
  course_id: z.number()
});

export type GetCourseStudentsInput = z.infer<typeof getCourseStudentsInputSchema>;

export const deleteUserInputSchema = z.object({
  id: z.number()
});

export type DeleteUserInput = z.infer<typeof deleteUserInputSchema>;

export const deleteCourseInputSchema = z.object({
  id: z.number()
});

export type DeleteCourseInput = z.infer<typeof deleteCourseInputSchema>;

export const deleteCourseMaterialInputSchema = z.object({
  id: z.number()
});

export type DeleteCourseMaterialInput = z.infer<typeof deleteCourseMaterialInputSchema>;

export const deleteAssignmentInputSchema = z.object({
  id: z.number()
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentInputSchema>;