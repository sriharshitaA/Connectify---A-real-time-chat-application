-- Supabase Schema for Connectly Chat App (Working Version)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS MESSAGES;

DROP TABLE IF EXISTS CHATROOMS;

DROP TABLE IF EXISTS USERS;

-- Users table
CREATE TABLE USERS (
     ID UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
     NAME TEXT NOT NULL,
     EMAIL TEXT UNIQUE NOT NULL,
     AVATAR_URL TEXT,
     IS_ONLINE BOOLEAN DEFAULT FALSE,
     CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chatrooms table
CREATE TABLE CHATROOMS (
     ID UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
     USERS UUID[] NOT NULL,
     USERS_DATA TEXT NOT NULL,
     LAST_MESSAGE TEXT,
     CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE MESSAGES (
     ID UUID PRIMARY KEY DEFAULT UUID_GENERATE_V4(),
     CHAT_ROOM_ID UUID NOT NULL REFERENCES CHATROOMS(ID) ON DELETE CASCADE,
     SENDER_ID UUID NOT NULL REFERENCES USERS(ID) ON DELETE CASCADE,
     CONTENT TEXT,
     IMAGE_URL TEXT,
     FILE_URL TEXT,
     FILE_TYPE TEXT,
     LOCATION_LAT DOUBLE PRECISION,
     LOCATION_LNG DOUBLE PRECISION,
     CONTACT_USER_ID UUID REFERENCES USERS(ID),
     CREATED_AT TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IDX_MESSAGES_CHAT_ROOM_ID ON MESSAGES(CHAT_ROOM_ID);

CREATE INDEX IDX_MESSAGES_SENDER_ID ON MESSAGES(SENDER_ID);

-- Note: GIN index on UUID array not supported, using regular index instead
-- CREATE INDEX IDX_CHATROOMS_USERS ON CHATROOMS USING GIN (USERS);

-- Enable Row Level Security (RLS)
ALTER TABLE USERS ENABLE ROW LEVEL SECURITY;

ALTER TABLE CHATROOMS ENABLE ROW LEVEL SECURITY;

ALTER TABLE MESSAGES ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proper security
-- Users policies - allow registration and viewing
-- Allow anyone to insert during registration (before auth is fully set up)
CREATE POLICY "Allow user registration" ON USERS FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view own data" ON USERS FOR SELECT USING (AUTH.UID() = ID);

CREATE POLICY "Users can update own data" ON USERS FOR UPDATE USING (AUTH.UID() = ID);

-- Allow viewing all users for chat functionality (needed for user list)
CREATE POLICY "Users can view all users for chat" ON USERS FOR SELECT USING (TRUE);

-- Chatrooms policies - allow all operations for now to debug
CREATE POLICY "Allow all chatroom operations" ON CHATROOMS FOR ALL USING (TRUE);

-- Messages policies - allow all operations for now to debug
CREATE POLICY "Allow all message operations" ON MESSAGES FOR ALL USING (TRUE);

-- Storage policies for file uploads (these need to be run separately in Supabase dashboard)
-- Note: These policies should be applied to the storage bucket 'chat-images'
-- In Supabase dashboard: Storage > chat-images > Policies
-- 1. Allow authenticated users to upload files:
--    INSERT policy: auth.role() = 'authenticated'
-- 2. Allow authenticated users to view files:
--    SELECT policy: auth.role() = 'authenticated'