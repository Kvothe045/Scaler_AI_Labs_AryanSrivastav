export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface Board {
  id: number;
  title: string;
  background_color: string;
}

export interface Label {
  id: number;
  name: string;
  color_code: string;
}

export interface ChecklistItem {
  id: number;
  card_id: number;
  title: string;
  is_completed: boolean;
}

export interface Card {
  id: number;
  list_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  cover_image_color: string | null;
  is_archived: boolean;
  labels?: Label[];
  members?: User[];
  checklists?: ChecklistItem[]; 
  attachments?: Attachment[];
}

export interface List {
  id: number;
  board_id: number;
  title: string;
  position: number;
  color?: string | null;
  cards?: Card[];
}

export interface BoardState extends Board {
  my_role: 'owner' | 'editor' | 'viewer';
  lists?: List[];
  members?: User[];
  labels?: Label[];
}

export interface Attachment {
  id: number;
  card_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}