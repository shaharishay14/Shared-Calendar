// Test script to verify household member setup
// This is just for reference - you can run these checks in your app

const testHouseholdSetup = async () => {
  try {
    // 1. Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.email, user?.id);
    
    if (!user) {
      console.log('❌ User not authenticated - make sure you sign in first');
      return;
    }
    
    // 2. Check household devices
    const { data: devices } = await supabase
      .from('household_devices')
      .select('*')
      .eq('user_id', user.id);
    console.log('User devices:', devices?.length || 0);
    
    // 3. Check household members
    const { data: members, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('householdId', 'demo-shared-household'); // or your actual household ID
      
    console.log('Household members:', members?.length || 0);
    console.log('Members:', members);
    
    if (error) {
      console.log('❌ Error fetching members:', error.message);
    }
    
    // 4. Test if current user is in household_members
    const currentUserMember = members?.find(m => m.userId === user.id);
    console.log('Current user in household_members:', !!currentUserMember);
    
    return {
      authenticated: !!user,
      userId: user?.id,
      deviceCount: devices?.length || 0,
      memberCount: members?.length || 0,
      isUserInHousehold: !!currentUserMember
    };
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Usage: Call this in your ProfileScreen or add a test button
// testHouseholdSetup();
