import type { ApplicationFormPayloadV2, SiblingMemberPayload } from "@/lib/db/types";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function createEmptySiblingBuckets() {
  return {
    above18Working: [] as SiblingMemberPayload[],
    above18NonWorking: [] as SiblingMemberPayload[],
    studyInIpt: [] as SiblingMemberPayload[],
    age7to17: [] as SiblingMemberPayload[],
    age6Below: [] as SiblingMemberPayload[],
    specialTreatment: {
      hasOku: false,
      hasChronicIllness: false,
    },
  };
}

export function createDefaultApplicationFormV2(params: {
  fullName: string;
  email: string;
  mobileNumber: string;
}) {
  return {
    schemaVersion: 2,
    personalInfo: {
      fullName: params.fullName,
      studentId: "",
      campusOptionId: "",
      idType: "mykad",
      idNumber: "",
      address: "",
      gender: "male",
      religion: "islam",
      nationality: "malaysian",
      countryCode: null,
      facultyOptionId: "",
      courseOptionId: "",
      currentTrimester: "",
      studyDurationYears: 1,
      mobileNumber: params.mobileNumber,
      email: params.email,
    },
    familyInfo: {
      hasFatherGuardian: true,
      hasMotherGuardian: true,
      fatherGuardian: {
        name: "",
        identificationType: "mykad",
        identificationNumber: "",
        age: 18,
        relationship: "father",
        address: "",
        contactNo: "",
        monthlySalary: 0,
      },
      motherGuardian: {
        name: "",
        identificationType: "mykad",
        identificationNumber: "",
        age: 18,
        relationship: "mother",
        address: "",
        contactNo: "",
        monthlySalary: 0,
      },
      siblings: createEmptySiblingBuckets(),
    },
    financialDeclaration: {
      bankName: "",
      accountNumber: "",
      receivingOtherSupport: false,
      supportProviderOptionIds: [],
      mmuOutstandingInvoiceAmount: 0,
    },
  } satisfies ApplicationFormPayloadV2;
}

export function isApplicationFormV2(payload: unknown): payload is ApplicationFormPayloadV2 {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (payload as { schemaVersion?: number }).schemaVersion === 2;
}

export function mergeApplicationFormV2(
  current: ApplicationFormPayloadV2,
  patch: DeepPartial<ApplicationFormPayloadV2>,
) {
  return {
    ...current,
    ...patch,
    schemaVersion: 2,
    personalInfo: {
      ...current.personalInfo,
      ...(patch.personalInfo ?? {}),
    },
    familyInfo: {
      ...current.familyInfo,
      ...(patch.familyInfo ?? {}),
      fatherGuardian: {
        ...current.familyInfo.fatherGuardian,
        ...(patch.familyInfo?.fatherGuardian ?? {}),
      },
      motherGuardian: {
        ...current.familyInfo.motherGuardian,
        ...(patch.familyInfo?.motherGuardian ?? {}),
      },
      siblings: {
        ...current.familyInfo.siblings,
        ...(patch.familyInfo?.siblings ?? {}),
        specialTreatment: {
          ...current.familyInfo.siblings.specialTreatment,
          ...(patch.familyInfo?.siblings?.specialTreatment ?? {}),
        },
      },
    },
    financialDeclaration: {
      ...current.financialDeclaration,
      ...(patch.financialDeclaration ?? {}),
    },
  } satisfies ApplicationFormPayloadV2;
}

export function getRequiredAttachmentSlots(form: ApplicationFormPayloadV2) {
  const slots = new Set<string>([
    "personal.studentIdProof",
    "personal.latestTranscript",
    "financial.mmuOutstandingInvoice",
  ]);

  if (form.familyInfo.hasFatherGuardian !== false) {
    slots.add("family.fatherGuardian.payslip");
  }

  if (form.familyInfo.hasMotherGuardian !== false) {
    slots.add("family.motherGuardian.payslip");
  }

  for (const sibling of form.familyInfo.siblings.above18Working) {
    slots.add(`siblings.above18Working.${sibling.memberId}.icDoc`);
    slots.add(`siblings.above18Working.${sibling.memberId}.payslip`);
  }

  for (const sibling of form.familyInfo.siblings.above18NonWorking) {
    slots.add(`siblings.above18NonWorking.${sibling.memberId}.icDoc`);
  }

  for (const sibling of form.familyInfo.siblings.studyInIpt) {
    slots.add(`siblings.studyInIpt.${sibling.memberId}.icDoc`);
  }

  for (const sibling of form.familyInfo.siblings.age7to17) {
    slots.add(`siblings.age7to17.${sibling.memberId}.icDoc`);
  }

  for (const sibling of form.familyInfo.siblings.age6Below) {
    slots.add(`siblings.age6Below.${sibling.memberId}.icDoc`);
  }

  if (form.familyInfo.siblings.specialTreatment.hasOku) {
    slots.add("siblings.specialTreatment.okuCard");
  }

  if (form.familyInfo.siblings.specialTreatment.hasChronicIllness) {
    slots.add("siblings.specialTreatment.chronicTreatment");
  }

  if (form.financialDeclaration.receivingOtherSupport) {
    for (const providerId of form.financialDeclaration.supportProviderOptionIds) {
      slots.add(`financial.support.${providerId}.proof`);
    }
  }

  return [...slots];
}
