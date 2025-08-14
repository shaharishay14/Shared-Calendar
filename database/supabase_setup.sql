-- Supabase Setup for SharedCalendar App
-- Run these commands in your Supabase SQL editor

-- Create household_members table (linked to auth.users)
CREATE TABLE IF NOT EXISTS household_members (
    id BIGSERIAL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "userId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Create unique constraint on householdId + userId
    UNIQUE("householdId", "userId")
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_household_members_household_active 
ON household_members("householdId", "isActive");

-- Enable Row Level Security (RLS)
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read household members from their household
CREATE POLICY "Users can view household members" ON household_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM household_devices hd 
            WHERE hd.household_id = "householdId" 
            AND hd.user_id = auth.uid()
        )
    );

-- Create policy to allow users to manage household members from their household
CREATE POLICY "Users can manage household members" ON household_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM household_devices hd 
            WHERE hd.household_id = "householdId" 
            AND hd.user_id = auth.uid()
        )
    );

-- Note: These policies ensure only authenticated users in the same household
-- can view and manage household members

-- Optional: Add some sample data for testing
-- INSERT INTO household_members ("householdId", "userId", name, email, role) VALUES
-- ('demo-shared-household', 'user_1', 'John Doe', 'john@example.com', 'admin'),
-- ('demo-shared-household', 'user_2', 'Jane Smith', 'jane@example.com', 'member');
