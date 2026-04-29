export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SendMessageRequest {
  receiver_id: number;
  content: string;
}

export interface SendMessageResponse {
  data: ChatMessage;
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}

export interface GetMessagesResponse {
  data: {
    messages: ChatMessage[];
    total: number;
    offset: number;
    limit: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}

export interface ChatConversation {
  other_user_id: number;
  other_user_name: string;
  other_user_email: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_sent_by_me: boolean;
}

export interface GetConversationsResponse {
  data: {
    conversations: ChatConversation[];
    total: number;
    offset: number;
    limit: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: string | null;
  };
}
