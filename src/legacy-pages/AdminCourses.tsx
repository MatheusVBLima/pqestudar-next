"use client";

import { CourseManagement } from "@/components/admin/CourseManagement";

export default function AdminCourses() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <CourseManagement />
      </div>
    </div>
  );
}
