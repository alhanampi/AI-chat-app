import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_STRING);

await sql`
  CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT 'New Conversation',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS messages (
    id                BIGSERIAL PRIMARY KEY,
    conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    type              TEXT NOT NULL CHECK (type IN ('prompt', 'response')),
    text              TEXT NOT NULL,
    timestamp         TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
`;

console.log("Database tables created successfully.");
