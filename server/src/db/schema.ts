import { serial, text, pgTable, timestamp, integer, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for user roles
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'administrator']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  teacher_id: integer('teacher_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Enrollments table (many-to-many relationship between students and courses)
export const enrollmentsTable = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  enrolled_at: timestamp('enrolled_at').defaultNow().notNull(),
});

// Course materials table
export const courseMaterialsTable = pgTable('course_materials', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  title: text('title').notNull(),
  content: text('content'), // Nullable by default
  file_url: text('file_url'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Assignments table
export const assignmentsTable = pgTable('assignments', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  due_date: timestamp('due_date'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Assignment submissions table
export const assignmentSubmissionsTable = pgTable('assignment_submissions', {
  id: serial('id').primaryKey(),
  assignment_id: integer('assignment_id').notNull().references(() => assignmentsTable.id),
  student_id: integer('student_id').notNull().references(() => usersTable.id),
  content: text('content'), // Nullable by default
  file_url: text('file_url'), // Nullable by default
  submitted_at: timestamp('submitted_at').defaultNow().notNull(),
  grade: real('grade'), // Nullable by default, using real for decimal grades
  graded_at: timestamp('graded_at'), // Nullable by default
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  teachingCourses: many(coursesTable),
  enrollments: many(enrollmentsTable),
  submissions: many(assignmentSubmissionsTable),
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  teacher: one(usersTable, {
    fields: [coursesTable.teacher_id],
    references: [usersTable.id],
  }),
  enrollments: many(enrollmentsTable),
  materials: many(courseMaterialsTable),
  assignments: many(assignmentsTable),
}));

export const enrollmentsRelations = relations(enrollmentsTable, ({ one }) => ({
  student: one(usersTable, {
    fields: [enrollmentsTable.student_id],
    references: [usersTable.id],
  }),
  course: one(coursesTable, {
    fields: [enrollmentsTable.course_id],
    references: [coursesTable.id],
  }),
}));

export const courseMaterialsRelations = relations(courseMaterialsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [courseMaterialsTable.course_id],
    references: [coursesTable.id],
  }),
}));

export const assignmentsRelations = relations(assignmentsTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [assignmentsTable.course_id],
    references: [coursesTable.id],
  }),
  submissions: many(assignmentSubmissionsTable),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissionsTable, ({ one }) => ({
  assignment: one(assignmentsTable, {
    fields: [assignmentSubmissionsTable.assignment_id],
    references: [assignmentsTable.id],
  }),
  student: one(usersTable, {
    fields: [assignmentSubmissionsTable.student_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type NewEnrollment = typeof enrollmentsTable.$inferInsert;

export type CourseMaterial = typeof courseMaterialsTable.$inferSelect;
export type NewCourseMaterial = typeof courseMaterialsTable.$inferInsert;

export type Assignment = typeof assignmentsTable.$inferSelect;
export type NewAssignment = typeof assignmentsTable.$inferInsert;

export type AssignmentSubmission = typeof assignmentSubmissionsTable.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissionsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  courses: coursesTable,
  enrollments: enrollmentsTable,
  courseMaterials: courseMaterialsTable,
  assignments: assignmentsTable,
  assignmentSubmissions: assignmentSubmissionsTable,
};