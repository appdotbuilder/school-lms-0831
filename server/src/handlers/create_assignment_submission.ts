import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable, enrollmentsTable, usersTable } from '../db/schema';
import { type CreateAssignmentSubmissionInput, type AssignmentSubmission } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAssignmentSubmission = async (input: CreateAssignmentSubmissionInput): Promise<AssignmentSubmission> => {
  try {
    // First, validate that the assignment exists and get the course_id
    const assignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, input.assignment_id))
      .execute();

    if (assignment.length === 0) {
      throw new Error('Assignment not found');
    }

    const courseId = assignment[0].course_id;

    // Validate that the student exists and has the student role
    const student = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.student_id),
        eq(usersTable.role, 'student')
      ))
      .execute();

    if (student.length === 0) {
      throw new Error('Student not found or user is not a student');
    }

    // Validate that the student is enrolled in the course
    const enrollment = await db.select()
      .from(enrollmentsTable)
      .where(and(
        eq(enrollmentsTable.student_id, input.student_id),
        eq(enrollmentsTable.course_id, courseId)
      ))
      .execute();

    if (enrollment.length === 0) {
      throw new Error('Student is not enrolled in the course for this assignment');
    }

    // Check if student has already submitted for this assignment
    const existingSubmission = await db.select()
      .from(assignmentSubmissionsTable)
      .where(and(
        eq(assignmentSubmissionsTable.assignment_id, input.assignment_id),
        eq(assignmentSubmissionsTable.student_id, input.student_id)
      ))
      .execute();

    if (existingSubmission.length > 0) {
      throw new Error('Student has already submitted for this assignment');
    }

    // Create the assignment submission
    const result = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: input.assignment_id,
        student_id: input.student_id,
        content: input.content,
        file_url: input.file_url,
        // submitted_at will be set by the database default (defaultNow())
        // grade and graded_at are null by default
      })
      .returning()
      .execute();

    const submission = result[0];
    
    return {
      ...submission,
      grade: submission.grade ? parseFloat(submission.grade.toString()) : null
    };
  } catch (error) {
    console.error('Assignment submission creation failed:', error);
    throw error;
  }
};