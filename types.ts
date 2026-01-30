
export enum ClassType {
  PASITOS = 'pasitos', // Beginning
  VIAJE = 'viaje',     // Intermediate
  ADELANTE = 'adelante', // Int/Adv
  CUMBRE = 'cumbre'    // Advanced
}

export const ClassLabels: Record<ClassType, { name: string; level: string; color: string }> = {
  [ClassType.PASITOS]: { name: 'Pasitos', level: 'Beginning', color: 'bg-green-100 text-green-800 border-green-200' },
  [ClassType.VIAJE]: { name: 'Viaje', level: 'Intermediate', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  [ClassType.ADELANTE]: { name: 'Adelante', level: 'Int/Adv', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  [ClassType.CUMBRE]: { name: 'Cumbre', level: 'Advanced', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export type ActivityType = 'written' | 'spoken' | 'listening' | 'other';

export interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string;
}

export interface WarmUpRequest {
  classType: ClassType;
  unit: string;
  activityType: ActivityType;
  vocabulary: string;
  learningTargets: string;
  lessonPlan: string;
  attachment?: FileAttachment;
}

export interface WarmUpResult {
  title: string;
  instruction: string;
  content: string;
  teacherKey?: string;
  listeningScript?: string;
}
