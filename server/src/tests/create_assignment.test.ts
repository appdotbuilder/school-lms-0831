import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assignmentsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { createAssignment } from '../handlers/create_assignment';
import { eq } from 'drizzle-orm';

describe('createAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher = teacherResult[0];

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacher.id
      })
      .returning()
      .execute();

    const course = courseResult[0];

    return { teacher, course };
  };

  it('should create an assignment with all fields', async () => {
    const { course } = await setupTestData();
    
    const dueDate = new Date('2024-12-31T23:59:59Z');
    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Final Project',
      description: 'Complete the final project for the course',
      due_date: dueDate
    };

    const result = await createAssignment(testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.course_id).toEqual(course.id);
    expect(result.title).toEqual('Final Project');
    expect(result.description).toEqual('Complete the final project for the course');
    expect(result.due_date).toEqual(dueDate);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an assignment with nullable fields', async () => {
    const { course } = await setupTestData();
    
    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Simple Assignment',
      description: null,
      due_date: null
    };

    const result = await createAssignment(testInput);

    expect(result.id).toBeDefined();
    expect(result.course_id).toEqual(course.id);
    expect(result.title).toEqual('Simple Assignment');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    const { course } = await setupTestData();
    
    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Database Test Assignment',
      description: 'Testing database persistence',
      due_date: new Date('2024-06-15T12:00:00Z')
    };

    const result = await createAssignment(testInput);

    // Query the database to verify the assignment was saved
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].title).toEqual('Database Test Assignment');
    expect(assignments[0].description).toEqual('Testing database persistence');
    expect(assignments[0].course_id).toEqual(course.id);
    expect(assignments[0].created_at).toBeInstanceOf(Date);
    expect(assignments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject assignment for non-existent course', async () => {
    const nonExistentCourseId = 99999;
    
    const testInput: CreateAssignmentInput = {
      course_id: nonExistentCourseId,
      title: 'Invalid Assignment',
      description: 'This should fail',
      due_date: null
    };

    await expect(createAssignment(testInput)).rejects.toThrow(/course.*does not exist/i);
  });

  it('should create multiple assignments for the same course', async () => {
    const { course } = await setupTestData();
    
    const assignment1: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Assignment 1',
      description: 'First assignment',
      due_date: new Date('2024-03-15T23:59:59Z')
    };

    const assignment2: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Assignment 2',
      description: 'Second assignment',
      due_date: new Date('2024-04-15T23:59:59Z')
    };

    const result1 = await createAssignment(assignment1);
    const result2 = await createAssignment(assignment2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.course_id).toEqual(course.id);
    expect(result2.course_id).toEqual(course.id);
    expect(result1.title).toEqual('Assignment 1');
    expect(result2.title).toEqual('Assignment 2');

    // Verify both are in the database
    const allAssignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.course_id, course.id))
      .execute();

    expect(allAssignments).toHaveLength(2);
  });

  it('should handle timestamps correctly', async () => {
    const { course } = await setupTestData();
    
    const beforeCreate = new Date();
    
    const testInput: CreateAssignmentInput = {
      course_id: course.id,
      title: 'Timestamp Test',
      description: 'Testing timestamp handling',
      due_date: new Date('2024-12-01T10:00:00Z')
    };

    const result = await createAssignment(testInput);
    
    const afterCreate = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.due_date).toEqual(new Date('2024-12-01T10:00:00Z'));
  });
});