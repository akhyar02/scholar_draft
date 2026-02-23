export const apiEndpoints = {
  admin: {
    applicationOptions: "/api/admin/application-options",
    studyPrograms: "/api/admin/study-programs",
    scholarships: "/api/admin/scholarships",
    scholarshipById: (id: string) => `/api/admin/scholarships/${id}`,
    scholarshipUploadUrl: "/api/admin/scholarships/upload-url",
    applications: "/api/admin/applications",
    applicationById: (id: string) => `/api/admin/applications/${id}`,
    applicationStatus: (id: string) => `/api/admin/applications/${id}/status`,
    applicationReopen: (id: string) => `/api/admin/applications/${id}/reopen`,
  },
  public: {
    applicationOptions: "/api/public/application-options",
    applications: "/api/public/applications",
    studyPrograms: "/api/public/study-programs",
    uploadUrl: "/api/public/upload-url",
  },
  student: {
    applications: "/api/student/applications",
    applicationById: (id: string) => `/api/student/applications/${id}`,
    applicationUploadUrl: (id: string) => `/api/student/applications/${id}/upload-url`,
    applicationSubmit: (id: string) => `/api/student/applications/${id}/submit`,
    applicationDocumentsConfirm: (id: string) => `/api/student/applications/${id}/documents/confirm`,
  },
  scholarships: {
    list: "/api/scholarships",
    bySlug: (slug: string) => `/api/scholarships/${slug}`,
  },
} as const;
