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
  video_provider?: "vimeo" | "youtube" | null;
  vimeo_url: string | null;
  vimeo_video_id: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
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

export type VocabProgressStatus = "unknown" | "known" | "review";

export type VocabTestType =
  | "meaning_choice"
  | "word_choice"
  | "spelling"
  | "final_exam";

export type VocabQuestionType = VocabTestType | "meaning_ai";

export interface VocabFolder {
  id: string;
  name: string;
  teacher_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface VocabSet {
  id: string;
  title: string;
  description: string | null;
  folder_id: string | null;
  order_index: number;
  teacher_id: string | null;
  created_by: string | null;
  is_published: boolean;
  exam_compact?: boolean;
  source_job_id?: string | null;
  created_at: string;
  teacher?: Profile | null;
  folder?: VocabFolder | null;
}

export interface VocabItem {
  id: string;
  set_id: string;
  word: string;
  meaning: string;
  part_of_speech: string | null;
  example_sentence: string | null;
  example_meaning: string | null;
  synonyms: string | null;
  antonyms: string | null;
  order_index: number;
  created_at: string;
}

export interface VocabAssignment {
  id: string;
  set_id: string;
  student_id: string | null;
  class_id: string | null;
  assigned_by: string | null;
  created_at: string;
  student?: Profile | null;
  class?: Class | null;
}

export interface VocabProgress {
  id: string;
  student_id: string;
  item_id: string;
  status: VocabProgressStatus;
  studied_count: number;
  last_studied_at: string | null;
  created_at: string;
}

export interface VocabTestAttempt {
  id: string;
  set_id: string;
  student_id: string;
  test_type: VocabTestType;
  score: number;
  total_questions: number;
  correct_count: number;
  started_at: string;
  submitted_at: string | null;
  created_at: string;
}

export interface VocabTestAnswer {
  id: string;
  attempt_id: string;
  item_id: string;
  question_type: VocabQuestionType;
  question_text: string | null;
  correct_answer: string | null;
  student_answer: string | null;
  is_correct: boolean;
  choices: string[] | null;
  created_at: string;
}

export interface VocabStageProgress {
  id: string;
  student_id: string;
  set_id: string;
  stage1_completed: boolean;
  stage1_completed_at: string | null;
  stage1_seen_item_ids: string[];
  stage2_completed: boolean;
  stage2_completed_at: string | null;
  stage3_completed: boolean;
  stage3_completed_at: string | null;
  stage3_passed: boolean;
  stage3_best_score: number;
  stage3_last_score: number;
  stage3_attempt_count: number;
  stage3_passed_at: string | null;
  stage4_passed: boolean;
  stage4_best_score: number;
  stage4_last_score: number;
  stage4_attempt_count: number;
  stage4_passed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VocabFinalTestAttempt {
  id: string;
  student_id: string;
  set_id: string;
  score: number;
  total_questions: number;
  correct_count: number;
  passed: boolean;
  submitted_at: string;
  created_at: string;
}

export interface VocabFinalTestAnswer {
  id: string;
  attempt_id: string;
  item_id: string;
  question_type: "meaning" | "spelling";
  question_text: string | null;
  correct_answer: string | null;
  student_answer: string | null;
  is_correct: boolean;
  ai_feedback: string | null;
  created_at: string;
}

export interface StudentVocabSetSummary {
  set: VocabSet;
  itemCount: number;
  stage1Completed: boolean;
  stage2Completed: boolean;
  stage3Completed: boolean;
  stage4Passed: boolean;
  stage4LastScore: number;
  stage4BestScore: number;
}
