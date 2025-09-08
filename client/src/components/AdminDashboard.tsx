import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Course, 
  UserRole,
  CreateUserInput,
  CreateCourseInput,
  UpdateUserInput,
  UpdateCourseInput
} from '../../../server/src/schema';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [, setSelectedUser] = useState<User | null>(null);
  const [, setSelectedCourse] = useState<Course | null>(null);
  
  // Dialog states
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [createCourseDialog, setCreateCourseDialog] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editCourseDialog, setEditCourseDialog] = useState(false);
  
  // Form states
  const [userForm, setUserForm] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'student'
  });
  
  const [courseForm, setCourseForm] = useState<CreateCourseInput>({
    name: '',
    description: null,
    teacher_id: 0
  });

  const [editUserForm, setEditUserForm] = useState<UpdateUserInput>({
    id: 0,
    email: '',
    first_name: '',
    last_name: '',
    role: 'student'
  });
  
  const [editCourseForm, setEditCourseForm] = useState<UpdateCourseInput>({
    id: 0,
    name: '',
    description: null,
    teacher_id: 0
  });

  // Loading states
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query({});
      setUsers(result);
      setTeachers(result.filter((u: User) => u.role === 'teacher'));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadCourses();
  }, [loadUsers, loadCourses]);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'student':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teacher':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'administrator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'student':
        return '🎓';
      case 'teacher':
        return '👨‍🏫';
      case 'administrator':
        return '⚙️';
      default:
        return '👤';
    }
  };

  const getTeacherName = (teacherId: number) => {
    const teacher = teachers.find((t: User) => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : `Teacher #${teacherId}`;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await trpc.createUser.mutate(userForm);
      setUserForm({
        email: '',
        first_name: '',
        last_name: '',
        role: 'student'
      });
      setCreateUserDialog(false);
      await loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCourse(true);
    try {
      await trpc.createCourse.mutate(courseForm);
      setCourseForm({
        name: '',
        description: null,
        teacher_id: 0
      });
      setCreateCourseDialog(false);
      await loadCourses();
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingUser(true);
    try {
      await trpc.updateUser.mutate(editUserForm);
      setEditUserDialog(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCourse(true);
    try {
      await trpc.updateCourse.mutate(editCourseForm);
      setEditCourseDialog(false);
      setSelectedCourse(null);
      await loadCourses();
    } catch (error) {
      console.error('Failed to update course:', error);
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    setIsDeletingUser(true);
    try {
      await trpc.deleteUser.mutate({ id: userId });
      await loadUsers();
      await loadCourses(); // Refresh courses in case we deleted a teacher
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    setIsDeletingCourse(true);
    try {
      await trpc.deleteCourse.mutate({ id: courseId });
      await loadCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const openEditUserDialog = (userToEdit: User) => {
    setEditUserForm({
      id: userToEdit.id,
      email: userToEdit.email,
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      role: userToEdit.role
    });
    setSelectedUser(userToEdit);
    setEditUserDialog(true);
  };

  const openEditCourseDialog = (courseToEdit: Course) => {
    setEditCourseForm({
      id: courseToEdit.id,
      name: courseToEdit.name,
      description: courseToEdit.description,
      teacher_id: courseToEdit.teacher_id
    });
    setSelectedCourse(courseToEdit);
    setEditCourseDialog(true);
  };

  const getUserStats = () => {
    const stats = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);
    
    return {
      student: stats.student || 0,
      teacher: stats.teacher || 0,
      administrator: stats.administrator || 0,
      total: users.length
    };
  };

  const userStats = getUserStats();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">
            Administrator Dashboard ⚙️
          </h2>
          <p className="text-purple-100">
            Managing the learning ecosystem with {userStats.total} users and {courses.length} courses
          </p>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userStats.student}</div>
            <div className="text-sm text-gray-600">🎓 Students</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{userStats.teacher}</div>
            <div className="text-sm text-gray-600">👨‍🏫 Teachers</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{userStats.administrator}</div>
            <div className="text-sm text-gray-600">⚙️ Administrators</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{courses.length}</div>
            <div className="text-sm text-gray-600">📚 Courses</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">👥 User Management</TabsTrigger>
          <TabsTrigger value="courses">📚 Course Management</TabsTrigger>
        </TabsList>

        {/* Users Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Users ({users.length})</h3>
            <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  ➕ Create New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user_first_name">First Name</Label>
                      <Input
                        id="user_first_name"
                        value={userForm.first_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="user_last_name">Last Name</Label>
                      <Input
                        id="user_last_name"
                        value={userForm.last_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setUserForm((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={userForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUserForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="user_role">Role</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value: UserRole) =>
                        setUserForm((prev: CreateUserInput) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">🎓 Student</SelectItem>
                        <SelectItem value="teacher">👨‍🏫 Teacher</SelectItem>
                        <SelectItem value="administrator">⚙️ Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isCreatingUser} className="w-full">
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((userItem: User) => (
              <Card key={userItem.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">
                        {userItem.first_name} {userItem.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{userItem.email}</p>
                    </div>
                    <Badge className={getRoleColor(userItem.role)}>
                      {getRoleIcon(userItem.role)}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    Joined: {userItem.created_at.toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditUserDialog(userItem)}
                      className="flex-1"
                    >
                      ✏️ Edit
                    </Button>
                    
                    {userItem.id !== user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            🗑️
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {userItem.first_name} {userItem.last_name}?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isDeletingUser}
                            >
                              {isDeletingUser ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {users.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600 mb-4">
                  No users found.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Courses Management Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Courses ({courses.length})</h3>
            <Dialog open={createCourseDialog} onOpenChange={setCreateCourseDialog}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700">
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
                  <div>
                    <Label htmlFor="course_teacher">Assign Teacher</Label>
                    <Select
                      value={courseForm.teacher_id > 0 ? courseForm.teacher_id.toString() : ''}
                      onValueChange={(value: string) =>
                        setCourseForm((prev: CreateCourseInput) => ({ ...prev, teacher_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher: User) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={isCreatingCourse || courseForm.teacher_id === 0} className="w-full">
                    {isCreatingCourse ? 'Creating...' : 'Create Course'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {courses.map((course: Course) => (
              <Card key={course.id} className="border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{course.name}</h3>
                      {course.description && (
                        <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Teacher: {getTeacherName(course.teacher_id)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    Created: {course.created_at.toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditCourseDialog(course)}
                      className="flex-1"
                    >
                      ✏️ Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Course</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{course.name}"?
                            This will also remove all associated materials, assignments, and submissions.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCourse(course.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeletingCourse}
                          >
                            {isDeletingCourse ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {courses.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-600 mb-4">
                  No courses found.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialog} onOpenChange={setEditUserDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_user_first_name">First Name</Label>
                <Input
                  id="edit_user_first_name"
                  value={editUserForm.first_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditUserForm((prev: UpdateUserInput) => ({ ...prev, first_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit_user_last_name">Last Name</Label>
                <Input
                  id="edit_user_last_name"
                  value={editUserForm.last_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditUserForm((prev: UpdateUserInput) => ({ ...prev, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_user_email">Email</Label>
              <Input
                id="edit_user_email"
                type="email"
                value={editUserForm.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditUserForm((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit_user_role">Role</Label>
              <Select
                value={editUserForm.role}
                onValueChange={(value: UserRole) =>
                  setEditUserForm((prev: UpdateUserInput) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">🎓 Student</SelectItem>
                  <SelectItem value="teacher">👨‍🏫 Teacher</SelectItem>
                  <SelectItem value="administrator">⚙️ Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isUpdatingUser} className="w-full">
              {isUpdatingUser ? 'Updating...' : 'Update User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={editCourseDialog} onOpenChange={setEditCourseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCourse} className="space-y-4">
            <div>
              <Label htmlFor="edit_course_name">Course Name</Label>
              <Input
                id="edit_course_name"
                value={editCourseForm.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditCourseForm((prev: UpdateCourseInput) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit_course_description">Description</Label>
              <Textarea
                id="edit_course_description"
                value={editCourseForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditCourseForm((prev: UpdateCourseInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="edit_course_teacher">Assign Teacher</Label>
              <Select
                value={editCourseForm.teacher_id && editCourseForm.teacher_id > 0 ? editCourseForm.teacher_id.toString() : ''}
                onValueChange={(value: string) =>
                  setEditCourseForm((prev: UpdateCourseInput) => ({ ...prev, teacher_id: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher: User) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()}>
                      {teacher.first_name} {teacher.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isUpdatingCourse} className="w-full">
              {isUpdatingCourse ? 'Updating...' : 'Update Course'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}