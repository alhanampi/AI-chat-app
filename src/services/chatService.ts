import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL}/api/chat`;

export const sendMessageToAPI = async (message: string) => {
  try {
    const response = await axios.post(API_URL, { message });
    return response.data.reply;
  } catch (error) {
    console.error("Error en chatService:", error);
    throw error;
  }
};

