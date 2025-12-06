import axios from "axios";

const API_URL = "http://localhost:3001/api/chat";

export const sendMessageToAPI = async (message: string) => {
  try {
    const response = await axios.post(API_URL, { message });
    return response.data.reply;
  } catch (error) {
    console.error("Error en chatService:", error);
    throw error;
  }
};
