import axios from "axios";

export const sendMessageToAPI = async (message: string) => {
  try {
    const response = await axios.post("/api/chat", { message });
    return response.data.reply;
  } catch (error) {
    console.error("Error en chatService:", error);
    throw error;
  }
};

