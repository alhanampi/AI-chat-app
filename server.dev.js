import express from "express";
import chatHandler from "./api/chat.js";
import conversationsHandler from "./api/conversations.js";
import conversationByIdHandler from "./api/conversations/[id]/index.js";
import duplicateHandler from "./api/conversations/[id]/duplicate.js";
import migrateHandler from "./api/migrate.js";

const app = express();
app.use(express.json());

app.all("/api/chat", chatHandler);
app.all("/api/conversations", conversationsHandler);

// duplicate must come before :id so Express matches it first
app.all("/api/conversations/:id/duplicate", duplicateHandler);
app.all("/api/conversations/:id", conversationByIdHandler);

app.all("/api/migrate", migrateHandler);

app.listen(3000, () =>
  console.log("API dev server → http://localhost:3000"),
);
