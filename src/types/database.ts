export type UserRole = "admin" | "teacher" | "student";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  username: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  teacher_id: string | null;
  is_published: boolean;
  created_at: string;
  teacher?: Profile | null;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  section_id: string;
  teacher_id: string | null;
  title: string;
  description: string | null;
  vimeo_url: string | null;
  vimeo_video_id: string | null;
  material_url: string | null;
  order_index: number;
  is_published: boolean;
  created_at: string;
  section?: Section;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  teacher?: Profile | null;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  created_at: string;
  student?: Profile;
}

export interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  assigned_by: string | null;
  created_at: string;
  course?: Course;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  assigned_by: string | null;
  created_at: string;
  student?: Profile;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  last_watched_at: string | null;
  watched_seconds: number;
  progress_percent: number;
}

export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}
