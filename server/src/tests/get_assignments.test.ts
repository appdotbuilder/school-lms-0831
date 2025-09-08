import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, assignmentsTable } from '../db/schema';
import { type GetAssignmentsInput } from '../schema';
import { getAssignments } from '../handlers/get_assignments';

describe('getAssignments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let teacherId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();
    teacherId = teacherResult[0].id;

    // Create a course
    const courseResult = await db.insert(coursesTable)
      .values({
        name: 'Test Course',
        description: 'A test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;
  });

  it('should return assignments for a specific course', async () => {
    // Create test assignments
    const dueDate = new Date('2024-12-31');
    
    await db.insert(assignmentsTable)
      .values([
        {
          course_id: courseId,
          title: 'Assignment 1',
          description: 'First assignment',
          due_date: dueDate
        },
        {
          course_id: courseId,
          title: 'Assignment 2',
          description: 'Second assignment',
          due_date: null
        }
      ])
      .execute();

    const testInput: GetAssignmentsInput = {
      course_id: courseId
    };

    const results = await getAssignments(testInput);

    expect(results).toHaveLength(2);
    
    // Check first assignment
    expect(results[0].title).toEqual('Assignment 1');
    expect(results[0].description).toEqual('First assignment');
    expect(results[0].course_id).toEqual(courseId);
    expect(results[0].due_date).toEqual(dueDate);
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);

    // Check second assignment
    expect(results[1].title).toEqual('Assignment 2');
    expect(results[1].description).toEqual('Second assignment');
    expect(results[1].course_id).toEqual(courseId);
    expect(results[1].due_date).toBeNull();
    expect(results[1].id).toBeDefined();
    expect(results[1].created_at).toBeInstanceOf(Date);
    expect(results[1].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for course with no assignments', async () => {
    const testInput: GetAssignmentsInput = {
      course_id: courseId
    };

    const results = await getAssignments(testInput);

    expect(results).toHaveLength(0);
    expect(results).toEqual([]);
  });

  it('should return empty array for non-existent course', async () => {
    const testInput: GetAssignmentsInput = {
      course_id: 99999 // Non-existent course ID
    };

    const results = await getAssignments(testInput);

    expect(results).toHaveLength(0);
    expect(results).toEqual([]);
  });

  it('should only return assignments for the specified course', async () => {
    // Create another course
    const anotherCourseResult = await db.insert(coursesTable)
      .values({
        name: 'Another Course',
        description: 'Another test course',
        teacher_id: teacherId
      })
      .returning()
      .execute();
    const anotherCourseId = anotherCourseResult[0].id;

    // Create assignments for both courses
    await db.insert(assignmentsTable)
      .values([
        {
          course_id: courseId,
          title: 'Course 1 Assignment',
          description: 'Assignment for course 1',
          due_date: null
        },
        {
          course_id: anotherCourseId,
          title: 'Course 2 Assignment',
          description: 'Assignment for course 2',
          due_date: null
        }
      ])
      .execute();

    const testInput: GetAssignmentsInput = {
      course_id: courseId
    };

    const results = await getAssignments(testInput);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Course 1 Assignment');
    expect(results[0].course_id).toEqual(courseId);
  });

  it('should handle assignments with various due dates correctly', async () => {
    const pastDate = new Date('2020-01-01');
    const futureDate = new Date('2025-12-31');
    
    await db.insert(assignmentsTable)
      .values([
        {
          course_id: courseId,
          title: 'Past Assignment',
          description: 'Assignment with past due date',
          due_date: pastDate
        },
        {
          course_id: courseId,
          title: 'Future Assignment',
          description: 'Assignment with future due date',
          due_date: futureDate
        },
        {
          course_id: courseId,
          title: 'No Due Date Assignment',
          description: 'Assignment with no due date',
          due_date: null
        }
      ])
      .execute();

    const testInput: GetAssignmentsInput = {
      course_id: courseId
    };

    const results = await getAssignments(testInput);

    expect(results).toHaveLength(3);
    
    // Find assignments by title
    const pastAssignment = results.find(a => a.title === 'Past Assignment');
    const futureAssignment = results.find(a => a.title === 'Future Assignment');
    const noDueDateAssignment = results.find(a => a.title === 'No Due Date Assignment');

    expect(pastAssignment?.due_date).toEqual(pastDate);
    expect(futureAssignment?.due_date).toEqual(futureDate);
    expect(noDueDateAssignment?.due_date).toBeNull();
  });
});