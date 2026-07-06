/**
 * Types for the Party Ticket & Scanner System
 */

export type TicketStatus = 'valid' | 'checked-in' | 'cancelled';

export interface EventDetails {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
}

export interface Ticket {
  id: string; // Unique ticket registration code
  name: string;
  status: TicketStatus;
  createdAt: string;
  checkedInAt?: string;
  notes?: string;
  eventName?: string;
}

export interface Doorman {
  id: string;
  name: string;
  pin: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  name: string;
  createdAt: string;
}

export interface SystemStats {
  totalSold: number;
  totalCheckedIn: number;
}
