import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';

export async function getCourses(): Promise<Course[]> {
  try {
    // Fetch all courses from the database
    const result = await db.select()
      .from(coursesTable)
      .execute();

    // Return the courses (no numeric conversions needed for this table)
    return result;
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
}