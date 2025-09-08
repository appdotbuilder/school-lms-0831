import { db } from '../db';
import { enrollmentsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateEnrollmentInput, type Enrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createEnrollment = async (input: CreateEnrollmentInput): Promise<Enrollment> => {
  try {
    // Verify that the student exists and has the 'student' role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.student_id))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found');
    }

    if (student[0].role !== 'student') {
      throw new Error('User is not a student');
    }

    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Check if the student is already enrolled in the course
    const existingEnrollment = await db.select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.student_id, input.student_id),
          eq(enrollmentsTable.course_id, input.course_id)
        )
      )
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error('Student is already enrolled in this course');
    }

    // Create the enrollment
    const result = await db.insert(enrollmentsTable)
      .values({
        student_id: input.student_id,
        course_id: input.course_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Enrollment creation failed:', error);
    throw error;
  }
};