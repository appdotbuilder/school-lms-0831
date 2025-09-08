import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { type GetCoursesByTeacherInput } from '../schema';
import { getCoursesByTeacher } from '../handlers/get_courses_by_teacher';
import { eq } from 'drizzle-orm';

describe('getCoursesByTeacher', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return courses taught by a specific teacher', async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'John',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create courses for this teacher
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          name: 'Mathematics 101',
          description: 'Basic mathematics course',
          teacher_id: teacherId
        },
        {
          name: 'Advanced Calculus',
          description: 'Advanced mathematics course',
          teacher_id: teacherId
        }
      ])
      .returning()
      .execute();

    const input: GetCoursesByTeacherInput = {
      teacher_id: teacherId
    };

    const result = await getCoursesByTeacher(input);

    // Should return exactly 2 courses
    expect(result).toHaveLength(2);
    
    // Verify course details
    const courseNames = result.map(course => course.name).sort();
    expect(courseNames).toEqual(['Advanced Calculus', 'Mathematics 101']);
    
    // Verify all courses belong to the correct teacher
    result.forEach(course => {
      expect(course.teacher_id).toEqual(teacherId);
      expect(course.id).toBeDefined();
      expect(course.created_at).toBeInstanceOf(Date);
      expect(course.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when teacher has no courses', async () => {
    // Create a teacher with no courses
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'newteacher@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const input: GetCoursesByTeacherInput = {
      teacher_id: teacherResult[0].id
    };

    const result = await getCoursesByTeacher(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent teacher', async () => {
    const input: GetCoursesByTeacherInput = {
      teacher_id: 99999 // Non-existent teacher ID
    };

    const result = await getCoursesByTeacher(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should not return courses from other teachers', async () => {
    // Create two teachers
    const teacher1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@example.com',
        first_name: 'Alice',
        last_name: 'Johnson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@example.com',
        first_name: 'Bob',
        last_name: 'Wilson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Id = teacher1Result[0].id;
    const teacher2Id = teacher2Result[0].id;

    // Create courses for both teachers
    await db.insert(coursesTable)
      .values([
        {
          name: 'Teacher 1 Course A',
          description: 'Course by teacher 1',
          teacher_id: teacher1Id
        },
        {
          name: 'Teacher 1 Course B',
          description: 'Another course by teacher 1',
          teacher_id: teacher1Id
        },
        {
          name: 'Teacher 2 Course',
          description: 'Course by teacher 2',
          teacher_id: teacher2Id
        }
      ])
      .returning()
      .execute();

    // Query courses for teacher 1
    const input: GetCoursesByTeacherInput = {
      teacher_id: teacher1Id
    };

    const result = await getCoursesByTeacher(input);

    // Should only return courses for teacher 1
    expect(result).toHaveLength(2);
    result.forEach(course => {
      expect(course.teacher_id).toEqual(teacher1Id);
      expect(course.name).toMatch(/^Teacher 1/);
    });
  });

  it('should handle courses with nullable description', async () => {
    // Create a teacher
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create a course with null description
    await db.insert(coursesTable)
      .values({
        name: 'Course without Description',
        description: null,
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const input: GetCoursesByTeacherInput = {
      teacher_id: teacherId
    };

    const result = await getCoursesByTeacher(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Course without Description');
    expect(result[0].description).toBeNull();
    expect(result[0].teacher_id).toEqual(teacherId);
  });

  it('should verify courses exist in database', async () => {
    // Create a teacher and course
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    await db.insert(coursesTable)
      .values({
        name: 'Database Course',
        description: 'Learn database operations',
        teacher_id: teacherId
      })
      .returning()
      .execute();

    const input: GetCoursesByTeacherInput = {
      teacher_id: teacherId
    };

    const result = await getCoursesByTeacher(input);

    // Verify the course actually exists in the database
    const dbCourses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.teacher_id, teacherId))
      .execute();

    expect(dbCourses).toHaveLength(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(dbCourses[0].id);
    expect(result[0].name).toEqual(dbCourses[0].name);
  });
});