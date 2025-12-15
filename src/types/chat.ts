export interface Contact {
  id: string;
  name: string;
  nickname?: string;
  surname?: string;
  job_title?: string;
  company?: string;
  phone: string;
  avatar?: string;
  email?: string;
  tags: string[];
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  sender: 'contact' | 'agent';
  agentId?: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id: string;
  contact: Contact;
  lastMessage?: Message;
  unreadCount: number;
  status: 'open' | 'pending' | 'resolved' | 'waiting';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: Agent;
  queue?: Queue;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'supervisor' | 'agent';
  status: 'online' | 'away' | 'offline';
  activeChats: number;
  maxChats: number;
  queues: string[];
}

export interface Queue {
  id: string;
  name: string;
  color: string;
  description?: string;
  agents: string[];
  waitingCount: number;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  category: string;
}

export interface WhatsAppInstance {
  id: string;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qrCode?: string;
}
