import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Course, 
  CourseMaterial, 
  Assignment, 
  AssignmentSubmission,
  CreateCourseInput,
  CreateCourseMaterialInput,
  CreateAssignmentInput,
  GradeSubmissionInput
} from '../../../server/src/schema';

interface TeacherDashboardProps {
  user: User;
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [courseStudents, setCourseStudents] = useState<User[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Dialog states
  const [createCourseDialog, setCreateCourseDialog] = useState(false);
  const [createMaterialDialog, setCreateMaterialDialog] = useState(false);
  const [createAssignmentDialog, setCreateAssignmentDialog] = useState(false);
  const [gradeDialog, setGradeDialog] = useState<{open: boolean; submission: AssignmentSubmission | null}>({
    open: false,
    submission: null
  });

  // Form states
  const [courseForm, setCourseForm] = useState<CreateCourseInput>({
    name: '',
    description: null,
    teacher_id: user.id
  });
  
  const [materialForm, setMaterialForm] = useState<CreateCourseMaterialInput>({
    course_id: 0,
    title: '',
    content: null,
    file_url: null
  });
  
  const [assignmentForm, setAssignmentForm] = useState<CreateAssignmentInput>({
    course_id: 0,
    title: '',
    description: null,
    due_date: null
  });

  const [gradeForm, setGradeForm] = useState<GradeSubmissionInput>({
    id: 0,
    grade: 0
  });

  // Loading states
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCoursesByTeacher.query({ teacher_id: user.id });
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, [user.id]);

  const loadCourseData = useCallback(async (course: Course) => {
    try {
      const [materialsResult, assignmentsResult, studentsResult] = await Promise.all([
        trpc.getCourseMaterials.query({ course_id: course.id }),
        trpc.getAssignments.query({ course_id: course.id }),
        trpc.getCourseStudents.query({ course_id: course.id })
      ]);
      setCourseMaterials(materialsResult);
      setAssignments(assignmentsResult);
      setCourseStudents(studentsResult);
      setSelectedCourse(course);
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  }, []);

  const loadSubmissions = useCallback(async (assignment: Assignment) => {
    try {
      const result = await trpc.getSubmissions.query({ assignment_id: assignment.id });
      setSubmissions(result);
      setSelectedAssignment(assignment);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCourse(true);
    try {
      await trpc.createCourse.mutate(courseForm);
      setCourseForm({
        name: '',
        description: null,
        teacher_id: user.id
      });
      setCreateCourseDialog(false);
      await loadCourses();
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMaterial(true);
    try {
      await trpc.createCourseMaterial.mutate(materialForm);
      setMaterialForm({
        course_id: selectedCourse?.id || 0,
        title: '',
        content: null,
        file_url: null
      });
      setCreateMaterialDialog(false);
      if (selectedCourse) {
        await loadCourseData(selectedCourse);
      }
    } catch (error) {
      console.error('Failed to create material:', error);
    } finally {
      setIsCreatingMaterial(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAssignment(true);
    try {
      await trpc.createAssignment.mutate(assignmentForm);
      setAssignmentForm({
        course_id: selectedCourse?.id || 0,
        title: '',
        description: null,
        due_date: null
      });
      setCreateAssignmentDialog(false);
      if (selectedCourse) {
        await loadCourseData(selectedCourse);
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGrading(true);
    try {
      await trpc.gradeSubmission.mutate(gradeForm);
      setGradeDialog({ open: false, submission: null });
      if (selectedAssignment) {
        await loadSubmissions(selectedAssignment);
      }
    } catch (error) {
      console.error('Failed to grade submission:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const openGradeDialog = (submission: AssignmentSubmission) => {
    setGradeForm({
      id: submission.id,
      grade: submission.grade || 0
    });
    setGradeDialog({ open: true, submission });
  };

  const openMaterialDialog = () => {
    if (selectedCourse) {
      setMaterialForm({
        course_id: selectedCourse.id,
        title: '',
        content: null,
        file_url: null
      });
      setCreateMaterialDialog(true);
    }
  };

  const openAssignmentDialog = () => {
    if (selectedCourse) {
      setAssignmentForm({
        course_id: selectedCourse.id,
        title: '',
        description: null,
        due_date: null
      });
      setCreateAssignmentDialog(true);
    }
  };

  const getStudentNameById = (studentId: number) => {
    const student = courseStudents.find((s: User) => s.id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : `Student #${studentId}`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, Professor {user.last_name}! 👨‍🏫
          </h2>
          <p className="text-green-100">
            Ready to inspire minds and shape futures today?
          </p>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="courses">📚 My Courses</TabsTrigger>
          <TabsTrigger value="materials">📖 Materials</TabsTrigger>
          <TabsTrigger value="assignments">📝 Assignments</TabsTrigger>
          <TabsTrigger value="submissions">📤 Submissions</TabsTrigger>
          <TabsTrigger value="students">👥 Students</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">My Courses ({courses.length})</h3>
            <Dialog open={createCourseDialog} onOpenChange={setCreateCourseDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  ➕ Create New Course
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Course</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <Label htmlFor="course_name">Course Name</Label>
                    <Input
                      id="course_name"
                      value={courseForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCourseForm((prev: CreateCourseInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="course_description">Description</Label>
                    <Textarea
                      id="course_description"
                      value={courseForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCourseForm((prev: CreateCourseInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      rows={4}
                    />
                  </div>
                  <Button type="submit" disabled={isCreatingCourse} className="w-full">
                    {isCreatingCourse ? 'Creating...' : 'Create Course'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course: Course) => (
              <Card 
                key={course.id}
                className={`cursor-pointer transition-all ${
                  selectedCourse?.id === course.id 
                    ? 'border-green-500 bg-green-50' 
                    : 'hover:border-green-300'
                }`}
                onClick={() => loadCourseData(course)}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{course.name}</h3>
                  {course.description && (
                    <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {course.created_at.toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {courses.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600 mb-4">
                  You haven't created any courses yet.
                </p>
                <p className="text-gray-500">
                  Create your first course to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="space-y-4">
          {selectedCourse ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  Materials for {selectedCourse.name} ({courseMaterials.length})
                </h3>
                <Button onClick={openMaterialDialog} className="bg-blue-600 hover:bg-blue-700">
                  ➕ Add Material
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {courseMaterials.map((material: CourseMaterial) => (
                  <Card key={material.id} className="border-blue-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{material.title}</h3>
                      {material.content && (
                        <p className="text-gray-600 mt-2 text-sm">{material.content}</p>
                      )}
                      {material.file_url && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              📎 Open File
                            </a>
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Added: {material.created_at.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {courseMaterials.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No materials added yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  📚 Select a course to manage materials
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {selectedCourse ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  Assignments for {selectedCourse.name} ({assignments.length})
                </h3>
                <Button onClick={openAssignmentDialog} className="bg-orange-600 hover:bg-orange-700">
                  ➕ Create Assignment
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {assignments.map((assignment: Assignment) => (
                  <Card 
                    key={assignment.id} 
                    className={`border-orange-200 cursor-pointer transition-all ${
                      selectedAssignment?.id === assignment.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'hover:border-orange-300'
                    }`}
                    onClick={() => loadSubmissions(assignment)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-gray-600 mt-1 text-sm">{assignment.description}</p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        {assignment.due_date && (
                          <p>Due: {assignment.due_date.toLocaleDateString()}</p>
                        )}
                        <p>Created: {assignment.created_at.toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {assignments.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-600">No assignments created yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  📝 Select a course to manage assignments
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-4">
          {selectedAssignment ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Submissions for "{selectedAssignment.title}" ({submissions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submissions.map((submission: AssignmentSubmission) => (
                  <Card key={submission.id} className="border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {getStudentNameById(submission.student_id)}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {submission.content}
                          </p>
                          {submission.file_url && (
                            <div className="mt-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                  📎 View File
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          {submission.grade !== null ? (
                            <div>
                              <Badge className="bg-green-100 text-green-800">
                                {submission.grade}/100
                              </Badge>
                              {submission.graded_at && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Graded: {submission.graded_at.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => openGradeDialog(submission)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              📊 Grade
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        Submitted: {submission.submitted_at.toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {submissions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No submissions yet for this assignment.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  📤 Select an assignment to view submissions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {selectedCourse ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Students in {selectedCourse.name} ({courseStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseStudents.map((student: User) => (
                    <Card key={student.id} className="border-indigo-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {student.first_name} {student.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            🎓 Student
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {courseStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No students enrolled in this course yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600">
                  👥 Select a course to view enrolled students
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Material Dialog */}
      <Dialog open={createMaterialDialog} onOpenChange={setCreateMaterialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Course Material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMaterial} className="space-y-4">
            <div>
              <Label htmlFor="material_title">Title</Label>
              <Input
                id="material_title"
                value={materialForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMaterialForm((prev: CreateCourseMaterialInput) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="material_content">Content</Label>
              <Textarea
                id="material_content"
                value={materialForm.content || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setMaterialForm((prev: CreateCourseMaterialInput) => ({
                    ...prev,
                    content: e.target.value || null
                  }))
                }
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="material_file_url">File URL (optional)</Label>
              <Input
                id="material_file_url"
                value={materialForm.file_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMaterialForm((prev: CreateCourseMaterialInput) => ({
                    ...prev,
                    file_url: e.target.value || null
                  }))
                }
                placeholder="https://example.com/file.pdf"
              />
            </div>
            <Button type="submit" disabled={isCreatingMaterial} className="w-full">
              {isCreatingMaterial ? 'Adding...' : 'Add Material'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={createAssignmentDialog} onOpenChange={setCreateAssignmentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div>
              <Label htmlFor="assignment_title">Title</Label>
              <Input
                id="assignment_title"
                value={assignmentForm.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev: CreateAssignmentInput) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="assignment_description">Description</Label>
              <Textarea
                id="assignment_description"
                value={assignmentForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setAssignmentForm((prev: CreateAssignmentInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="assignment_due_date">Due Date (optional)</Label>
              <Input
                id="assignment_due_date"
                type="date"
                value={assignmentForm.due_date ? assignmentForm.due_date.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((prev: CreateAssignmentInput) => ({
                    ...prev,
                    due_date: e.target.value ? new Date(e.target.value) : null
                  }))
                }
              />
            </div>
            <Button type="submit" disabled={isCreatingAssignment} className="w-full">
              {isCreatingAssignment ? 'Creating...' : 'Create Assignment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grade Submission Dialog */}
      <Dialog 
        open={gradeDialog.open} 
        onOpenChange={(open) => setGradeDialog({ open, submission: gradeDialog.submission })}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Grade Submission
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGradeSubmission} className="space-y-4">
            <div>
              <Label htmlFor="grade">Grade (0-100)</Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="100"
                value={gradeForm.grade}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGradeForm((prev: GradeSubmissionInput) => ({ 
                    ...prev, 
                    grade: parseFloat(e.target.value) || 0 
                  }))
                }
                required
              />
            </div>
            <Button type="submit" disabled={isGrading} className="w-full">
              {isGrading ? 'Submitting Grade...' : 'Submit Grade'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}