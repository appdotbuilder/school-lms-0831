import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable } from '../db/schema';
import { getCourses } from '../handlers/get_courses';

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no courses exist', async () => {
    const result = await getCourses();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all courses when courses exist', async () => {
    // Create a teacher user first (required for foreign key)
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create test courses
    const course1 = {
      name: 'Mathematics 101',
      description: 'Introduction to Mathematics',
      teacher_id: teacherId
    };

    const course2 = {
      name: 'Physics 201',
      description: 'Advanced Physics',
      teacher_id: teacherId
    };

    const course3 = {
      name: 'Chemistry Basics',
      description: null,
      teacher_id: teacherId
    };

    await db.insert(coursesTable)
      .values([course1, course2, course3])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(3);

    // Check that all courses are returned
    const courseNames = result.map(course => course.name);
    expect(courseNames).toContain('Mathematics 101');
    expect(courseNames).toContain('Physics 201');
    expect(courseNames).toContain('Chemistry Basics');

    // Verify course structure
    result.forEach(course => {
      expect(course.id).toBeDefined();
      expect(typeof course.id).toBe('number');
      expect(typeof course.name).toBe('string');
      expect(course.teacher_id).toBe(teacherId);
      expect(course.created_at).toBeInstanceOf(Date);
      expect(course.updated_at).toBeInstanceOf(Date);
    });

    // Check specific course details
    const mathCourse = result.find(course => course.name === 'Mathematics 101');
    expect(mathCourse?.description).toBe('Introduction to Mathematics');

    const chemistryCourse = result.find(course => course.name === 'Chemistry Basics');
    expect(chemistryCourse?.description).toBeNull();
  });

  it('should return courses from multiple teachers', async () => {
    // Create two teacher users
    const teacher1Result = await db.insert(usersTable)
      .values({
        email: 'teacher1@test.com',
        first_name: 'Alice',
        last_name: 'Smith',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher2Result = await db.insert(usersTable)
      .values({
        email: 'teacher2@test.com',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacher1Id = teacher1Result[0].id;
    const teacher2Id = teacher2Result[0].id;

    // Create courses for different teachers
    await db.insert(coursesTable)
      .values([
        {
          name: 'English Literature',
          description: 'Study of classic literature',
          teacher_id: teacher1Id
        },
        {
          name: 'Computer Science',
          description: 'Programming fundamentals',
          teacher_id: teacher2Id
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);

    const teacherIds = result.map(course => course.teacher_id);
    expect(teacherIds).toContain(teacher1Id);
    expect(teacherIds).toContain(teacher2Id);
  });

  it('should handle courses with various description values', async () => {
    // Create a teacher user
    const teacherResult = await db.insert(usersTable)
      .values({
        email: 'teacher@test.com',
        first_name: 'Test',
        last_name: 'Teacher',
        role: 'teacher'
      })
      .returning()
      .execute();

    const teacherId = teacherResult[0].id;

    // Create courses with different description scenarios
    await db.insert(coursesTable)
      .values([
        {
          name: 'Course with Description',
          description: 'This course has a description',
          teacher_id: teacherId
        },
        {
          name: 'Course without Description',
          description: null,
          teacher_id: teacherId
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);

    const courseWithDesc = result.find(course => course.name === 'Course with Description');
    const courseWithoutDesc = result.find(course => course.name === 'Course without Description');

    expect(courseWithDesc?.description).toBe('This course has a description');
    expect(courseWithoutDesc?.description).toBeNull();
  });
});