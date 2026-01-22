
export enum UserRole {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  ATTENDANT = 'ATTENDANT'
}

export enum ScheduleStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  CONCLUDED = 'CONCLUDED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isAi?: boolean;
}

export interface TransferHistory {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  reason: string;
  date: string;
  time: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'SALE' | 'SCHEDULE' | 'REMINDER';
  refId?: string; // ID de referência (ex: ID da OS)
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  specialty?: string;
  ratingCount: number;
  ratingSum: number;
}

export interface Sale {
  id: string;
  attendantId: string;
  attendantName: string;
  productDescription: string;
  saleValue: number;
  date: string;
  commissionValue: number;
}

export interface Expense {
  id: string;
  description: string;
  category: 'GASOLINA' | 'PEÇAS' | 'ALIMENTAÇÃO' | 'FERRAMENTAS' | 'OUTROS';
  technicianId?: string; // ID do técnico caso o gasto seja associado a um
  technicianName?: string;
  value: number;
  date: string;
}

export interface CommissionPayment {
  id: string;
  userId: string;
  userName: string;
  value: number;
  date: string;
  type: 'FULL' | 'PARTIAL';
}

export interface Schedule {
  id: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientNumber?: string;
  appointmentDate: string;
  appointmentTime: string;
  startTime?: string; 
  endTime?: string;   
  cancellationTime?: string; 
  technicianId: string;
  attendantId?: string;
  attendantName: string;
  description: string;
  status: ScheduleStatus;
  workDoneDescription?: string;
  finalValue?: number;
  totalServiceValue?: number;
  depositValue?: number;
  balanceValue?: number;
  completionDate?: string;
  reviewStars?: number;
  reviewComment?: string;
  reviewLinkShared?: boolean;
  cancellationReason?: string;
  cancellationDate?: string;
  cancellationValue?: number;
  transfers?: TransferHistory[];
  reminderType?: '30MIN' | '1HOUR' | '1DAY' | 'NONE';
  messages?: ChatMessage[];
}

export interface AppState {
  users: User[];
  schedules: Schedule[];
  sales: Sale[];
  expenses: Expense[];
  commissionPayments: CommissionPayment[];
  currentUser: User | null;
  notifications: Notification[];
}
