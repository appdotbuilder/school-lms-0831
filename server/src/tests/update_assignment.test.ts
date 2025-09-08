import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable } from '../db/schema';
import { type UpdateAssignmentInput, type CreateUserInput, type CreateCourseInput, type CreateAssignmentInput } from '../schema';
import { updateAssignment } from '../handlers/update_assignment';
import { eq } from 'drizzle-orm';

// Test data
const testTeacher: CreateUserInput = {
  email: 'teacher@test.com',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'teacher'
};

const testCourse: CreateCourseInput = {
  name: 'Test Course',
  description: 'A course for testing',
  teacher_id: 0 // Will be set after creating teacher
};

const testAssignment: CreateAssignmentInput = {
  course_id: 0, // Will be set after creating course
  title: 'Original Assignment',
  description: 'Original description',
  due_date: new Date('2024-12-31')
};

describe('updateAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let courseId: number;
  let assignmentId: number;

  beforeEach(async () => {
    // Create teacher
    const teacherResult = await db.insert(usersTable)
      .values(testTeacher)
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourse,
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    // Create assignment
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        ...testAssignment,
        course_id: courseId
      })
      .returning()
      .execute();
    assignmentId = assignmentResult[0].id;
  });

  it('should update assignment title', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Updated Assignment Title'
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Updated Assignment Title');
    expect(result.description).toEqual('Original description');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify database was updated
    const dbAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();

    expect(dbAssignment[0].title).toEqual('Updated Assignment Title');
    expect(dbAssignment[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update assignment description', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      description: 'Updated assignment description'
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Original Assignment');
    expect(result.description).toEqual('Updated assignment description');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
  });

  it('should update assignment due date', async () => {
    const newDueDate = new Date('2025-01-15');
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      due_date: newDueDate
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Original Assignment');
    expect(result.description).toEqual('Original description');
    expect(result.due_date).toEqual(newDueDate);
  });

  it('should update multiple fields at once', async () => {
    const newDueDate = new Date('2025-02-20');
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Completely Updated Assignment',
      description: 'Completely updated description',
      due_date: newDueDate
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Completely Updated Assignment');
    expect(result.description).toEqual('Completely updated description');
    expect(result.due_date).toEqual(newDueDate);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify all changes in database
    const dbAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();

    expect(dbAssignment[0].title).toEqual('Completely Updated Assignment');
    expect(dbAssignment[0].description).toEqual('Completely updated description');
    expect(dbAssignment[0].due_date).toEqual(newDueDate);
  });

  it('should set description to null', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      description: null
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Original Assignment');
    expect(result.description).toBeNull();
    expect(result.due_date).toEqual(new Date('2024-12-31'));
  });

  it('should set due_date to null', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      due_date: null
    };

    const result = await updateAssignment(updateInput);

    expect(result.id).toEqual(assignmentId);
    expect(result.title).toEqual('Original Assignment');
    expect(result.description).toEqual('Original description');
    expect(result.due_date).toBeNull();
  });

  it('should preserve course_id and timestamps from original', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Updated Title'
    };

    const result = await updateAssignment(updateInput);

    expect(result.course_id).toEqual(courseId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent assignment', async () => {
    const updateInput: UpdateAssignmentInput = {
      id: 99999,
      title: 'This should fail'
    };

    await expect(updateAssignment(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalAssignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, assignmentId))
      .execute();
    const originalUpdatedAt = originalAssignment[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateAssignmentInput = {
      id: assignmentId,
      title: 'Updated to test timestamp'
    };

    const result = await updateAssignment(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});