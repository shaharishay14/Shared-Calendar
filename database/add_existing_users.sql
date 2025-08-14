-- Add existing users to household_members table
-- Replace the UUIDs and details with your actual user data from the debug queries

-- Example: Add first user (replace with actual UUID and details)
INSERT INTO household_members ("householdId", "userId", name, email, role, "isActive") 
VALUES (
    'demo-shared-household', -- or your actual household ID
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user UUID
    'User 1 Name', -- Replace with actual name
    'user1@example.com', -- Replace with actual email
    'admin',
    true
);

-- Example: Add second user (replace with actual UUID and details)
INSERT INTO household_members ("householdId", "userId", name, email, role, "isActive") 
VALUES (
    'demo-shared-household', -- or your actual household ID
    '11111111-1111-1111-1111-111111111111', -- Replace with actual user UUID
    'User 2 Name', -- Replace with actual name
    'user2@example.com', -- Replace with actual email
    'member',
    true
);

-- Verify the data was inserted
SELECT hm.*, u.email as auth_email
FROM household_members hm
JOIN auth.users u ON hm."userId" = u.id
ORDER BY hm."joinedAt";
