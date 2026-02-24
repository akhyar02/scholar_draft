import { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

import {
  ApplicationStatus,
  ApplicationOptionKind,
  DocumentType,
  EmailNotificationStatus,
  UserRole,
} from "@/lib/constants";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type LegacyApplicationFormPayload = {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  institution?: string;
  program?: string;
  graduationYear?: number;
  gpa?: number;
  personalStatement?: string;
};

export type SiblingMemberPayload = {
  memberId: string;
  name: string;
  idNumber: string;
  monthlySalary?: number;
};

export type ParentGuardianPayload = {
  name: string;
  identificationType: "mykad" | "passport";
  identificationNumber: string;
  age: number;
  relationship: "father" | "mother" | "guardian";
  address: string;
  contactNo: string;
  monthlySalary: number;
};

export type ApplicationFormPayloadV2 = {
  schemaVersion: 2;
  personalInfo: {
    fullName: string;
    studentId: string;
    campusOptionId: string;
    idType: "mykad" | "passport";
    idNumber: string;
    address: string;
    gender: "male" | "female";
    religion: "islam" | "non_islam";
    nationality: "malaysian" | "non_malaysian";
    countryCode: string | null;
    facultyOptionId: string;
    courseOptionId: string;
    currentTrimester: string;
    studyDurationYears: number;
    mobileNumber: string;
    email: string;
  };
  familyInfo: {
    hasFatherGuardian?: boolean;
    hasMotherGuardian?: boolean;
    fatherGuardian: ParentGuardianPayload;
    motherGuardian: ParentGuardianPayload;
    siblings: {
      above18Working: SiblingMemberPayload[];
      above18NonWorking: SiblingMemberPayload[];
      studyInIpt: SiblingMemberPayload[];
      age7to17: SiblingMemberPayload[];
      age6Below: SiblingMemberPayload[];
      specialTreatment: {
        hasOku: boolean;
        hasChronicIllness: boolean;
      };
    };
  };
  financialDeclaration: {
    bankName: string;
    accountNumber: string;
    receivingOtherSupport: boolean;
    supportProviderOptionIds: string[];
    mmuOutstandingInvoiceAmount: number;
  };
};

export type ApplicationFormPayload = LegacyApplicationFormPayload | ApplicationFormPayloadV2;

export interface UsersTable {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StudentProfilesTable {
  user_id: string;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  institution: string;
  program: string;
  graduation_year: number | null;
  gpa: ColumnType<number | null, number | null, number | null>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ScholarshipsTable {
  id: string;
  title: string;
  slug: string;
  description: string;
  image_url: string | null;
  amount: ColumnType<number, number, number>;
  currency: string;
  education_level: string | null;
  eligibility_text: string;
  deadline_at: Date;
  is_published: Generated<boolean>;
  created_by: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface StudyProgramsTable {
  id: string;
  name: string;
  sort_order: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ApplicationsTable {
  id: string;
  scholarship_id: string;
  student_user_id: string;
  status: ApplicationStatus;
  submitted_at: Date | null;
  locked_at: Date | null;
  reopened_at: Date | null;
  admin_notes: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ApplicationFormDataTable {
  application_id: string;
  payload: ColumnType<ApplicationFormPayload, ApplicationFormPayload, ApplicationFormPayload>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ApplicationDocumentsTable {
  id: string;
  application_id: string;
  doc_type: DocumentType;
  s3_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Generated<Date>;
}

export interface ApplicationAttachmentsTable {
  id: string;
  application_id: string;
  slot_key: string;
  s3_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: Generated<Date>;
}

export interface ApplicationOptionItemsTable {
  id: string;
  kind: ApplicationOptionKind;
  label: string;
  parent_id: string | null;
  sort_order: number;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ApplicationStatusHistoryTable {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_by_user_id: string;
  reason: string | null;
  changed_at: Generated<Date>;
}

export interface EmailNotificationsTable {
  id: string;
  application_id: string;
  recipient_email: string;
  template_key: string;
  status: EmailNotificationStatus;
  provider_message_id: string | null;
  error: string | null;
  sent_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PasswordResetTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Generated<Date>;
}

export interface Database {
  users: UsersTable;
  student_profiles: StudentProfilesTable;
  scholarships: ScholarshipsTable;
  study_programs: StudyProgramsTable;
  application_option_items: ApplicationOptionItemsTable;
  applications: ApplicationsTable;
  application_form_data: ApplicationFormDataTable;
  application_documents: ApplicationDocumentsTable;
  application_attachments: ApplicationAttachmentsTable;
  application_status_history: ApplicationStatusHistoryTable;
  email_notifications: EmailNotificationsTable;
  password_reset_tokens: PasswordResetTokensTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
