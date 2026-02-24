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

export type ApplicationFormPayload =
  | LegacyApplicationFormPayload
  | ApplicationFormPayloadV2;
