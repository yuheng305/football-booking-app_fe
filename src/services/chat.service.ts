import apiClient from "../utils/api.client";
import API_CONFIG from "../config/api.config";
import {
  ChatConversation,
  ChatMessage,
  GetConversationsResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesResponse,
} from "../types/chat.types";

class ChatService {
  async getConversations(params?: {
    offset?: number;
    limit?: number;
  }): Promise<{ conversations: ChatConversation[]; total: number; offset: number; limit: number }> {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 30;

    const response = await apiClient.get<GetConversationsResponse>(
      API_CONFIG.CHAT_ENDPOINTS.LIST_CONVERSATIONS,
      {
        params: {
          offset,
          limit,
        },
      }
    );

    return response.data;
  }

  async sendMessage(payload: SendMessageRequest): Promise<ChatMessage> {
    const trimmedContent = payload.content?.trim();
    if (!trimmedContent) {
      throw new Error("Nội dung tin nhắn không được để trống");
    }

    const response = await apiClient.post<SendMessageResponse>(
      API_CONFIG.CHAT_ENDPOINTS.SEND_MESSAGE,
      {
        receiver_id: payload.receiver_id,
        content: trimmedContent,
      }
    );

    return response.data;
  }

  async getMessages(params: {
    receiverId: number;
    offset?: number;
    limit?: number;
  }): Promise<{ messages: ChatMessage[]; total: number; offset: number; limit: number }> {
    const { receiverId, offset = 0, limit = 50 } = params;
    const endpoint = API_CONFIG.CHAT_ENDPOINTS.LIST_MESSAGES.replace(
      ":receiverId",
      String(receiverId)
    );

    const response = await apiClient.get<GetMessagesResponse>(endpoint, {
      params: {
        offset,
        limit,
      },
    });

    return response.data;
  }
}

export const chatService = new ChatService();
export default chatService;
