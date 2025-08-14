import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, HOUSEHOLD_ID, getHouseholdMembers, saveHouseholdMember, inviteHouseholdMember, removeHouseholdMember } from '../database/db';
import { useProfile } from '../contexts/ProfileContext';

const PROFILE_KEY = 'user_profile';

const defaultProfile = {
  name: '',
  email: '',
  phone: '',
  avatar: null,
  preferences: {
    defaultLocation: '',
    workLocation: '',
    notifications: true,
    language: 'en'
  }
};

export default function ProfileScreen({ navigation }) {
  const { profile, saveProfile: saveProfileContext, updateProfile, updatePreference, loading } = useProfile();
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHouseholdMembers();
  }, []);

  // Reload household members when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 ProfileScreen focused - reloading household members');
      loadHouseholdMembers();
    }, [])
  );

  // Auto-sync profile changes to household members
  useEffect(() => {
    const autoSyncProfile = async () => {
      if (profile.name && (profile.avatar || profile.email)) {
        console.log('🔄 Auto-syncing profile to household members...');
        try {
          const syncResult = await saveHouseholdMember({
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: 'admin'
          });
          if (syncResult.success) {
            console.log('✅ Profile auto-synced successfully');
            // Reload household members to show updated avatar
            loadHouseholdMembers();
          }
        } catch (error) {
          console.error('❌ Auto-sync failed:', error);
        }
      }
    };

    // Debounce the auto-sync to avoid too many calls
    const timeoutId = setTimeout(autoSyncProfile, 1000);
    return () => clearTimeout(timeoutId);
  }, [profile.avatar, profile.name, profile.email]);

  const loadHouseholdMembers = async () => {
    try {
      console.log('Loading household members from database...');
      const result = await getHouseholdMembers();
      
      if (result.success) {
        // Get current authenticated user ID
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;
        
        // Add current user to the list if not already present
        const currentUserInList = result.data.find(member => 
          member.userId === currentUserId || 
          member.name === profile.name || 
          member.email === profile.email
        );
        
        let members = [...result.data];
        
        if (!currentUserInList && profile.name) {
          // Save current user as a household member (using their auth user ID)
          const saveResult = await saveHouseholdMember({
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: 'admin'
            // userId will be automatically set to current authenticated user
          });
          
          if (saveResult.success) {
            members = [saveResult.data, ...members];
          }
        }
        
        // Mark which member is the current user and format data
        members = members.map(member => ({
          ...member,
          isCurrentUser: member.userId === currentUserId || 
                        member.name === profile.name || 
                        member.email === profile.email,
          lastActive: new Date(member.joinedAt || Date.now()),
          role: member.role === 'admin' ? 'Admin' : 'Member'
        }));

        // Debug avatar information
        console.log('🖼️ Member avatars debug:');
        members.forEach(member => {
          console.log(`  - ${member.name}: avatar = ${member.avatar || 'NULL'}`);
        });
        
        console.log('Loaded household members:', members.length);
        setHouseholdMembers(members);
      } else {
        console.error('Failed to load household members:', result.error);
        // Fallback to showing current user only
        if (profile.name) {
          setHouseholdMembers([{
            id: 'current',
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: 'Admin',
            isCurrentUser: true,
            lastActive: new Date(),
            joinedAt: new Date().toISOString()
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading household members:', error);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const success = await saveProfileContext(profile);
      
      if (success) {
        // Also update the household member record with the new profile data
        if (profile.name) {
          const saveResult = await saveHouseholdMember({
            name: profile.name,
            email: profile.email,
            avatar: profile.avatar,
            role: 'admin' // This will be ignored if user already exists
          });
          console.log('Updated household member profile:', saveResult.success);
        }
        
        Alert.alert('Success', 'Profile saved successfully!');
        // Reload household members to update current user info
        loadHouseholdMembers();
      } else {
        Alert.alert('Error', 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveProfileSilently = async () => {
    try {
      await saveProfileContext(profile);
      
      // Also update the household member record with the new avatar
      if (profile.name) {
        const saveResult = await saveHouseholdMember({
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          role: 'admin' // This will be ignored if user already exists
        });
        console.log('Updated household member avatar:', saveResult.success);
      }
      
      // Reload household members to update current user info
      loadHouseholdMembers();
    } catch (error) {
      console.error('Error auto-saving profile:', error);
    }
  };

  const showInviteMemberDialog = () => {
    Alert.prompt(
      'Invite New Member',
      'Enter the email address of the person you want to invite to your household calendar:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Invite', 
          onPress: async (email) => {
            if (email && email.includes('@')) {
              await inviteMember(email);
            } else {
              Alert.alert('Invalid Email', 'Please enter a valid email address.');
            }
          }
        }
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const inviteMember = async (email) => {
    try {
      console.log('Inviting member:', email);
      const result = await inviteHouseholdMember(email, 'member');
      
      if (result.success) {
        Alert.alert(
          'Invitation Sent!',
          `An invitation has been sent to ${email}. They will appear in your household once they accept.`,
          [{ text: 'OK', onPress: loadHouseholdMembers }]
        );
      } else {
        Alert.alert('Error', `Failed to send invitation: ${result.error}`);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    }
  };

  const removeMember = async (member) => {
    if (member.isCurrentUser) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the household.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from your household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeHouseholdMember(member.userId);
              if (result.success) {
                Alert.alert('Member Removed', `${member.name} has been removed from your household.`);
                loadHouseholdMembers();
              } else {
                Alert.alert('Error', `Failed to remove member: ${result.error}`);
              }
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          }
        }
      ]
    );
  };



  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Sorry, we need camera roll permissions to change your profile picture.'
        );
        return;
      }

      // Show action sheet for image source selection
      Alert.alert(
        'Select Profile Picture',
        'Choose how you want to set your profile picture',
        [
          { text: 'Camera', onPress: () => openCamera() },
          { text: 'Photo Library', onPress: () => openImagePicker() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to access camera or photo library');
    }
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Sorry, we need camera permissions to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        console.log('📸 New avatar captured:', newAvatarUri);
        updateProfile('avatar', newAvatarUri);
        
        // Immediately sync to household members
        setTimeout(async () => {
          await saveProfileSilently();
          console.log('🔄 Avatar synced after camera capture');
        }, 500);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        console.log('🖼️ New avatar selected from library:', newAvatarUri);
        updateProfile('avatar', newAvatarUri);
        
        // Immediately sync to household members
        setTimeout(async () => {
          await saveProfileSilently();
          console.log('🔄 Avatar synced after library selection');
        }, 500);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            updateProfile('avatar', null);
            // Auto-save after removing avatar
            setTimeout(() => {
              saveProfileSilently();
            }, 500);
          }
        }
      ]
    );
  };

  const renderSection = (title, children) => (
    <View style={{
      backgroundColor: '#3A4750',
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#00ADB5'
    }}>
      <Text style={{
        color: '#00ADB5',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16
      }}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderTextInput = (label, value, onChangeText, placeholder = '') => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#888"
        style={{
          backgroundColor: '#212121',
          color: '#EEEEEE',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#555'
        }}
      />
    </View>
  );

  const renderMember = (member) => (
    <View key={member.id} style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: member.isCurrentUser ? '#00ADB520' : '#212121',
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: member.isCurrentUser ? 1 : 0,
      borderColor: '#00ADB5'
    }}>
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: member.avatar ? 'transparent' : '#00ADB5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden'
      }}>
        {member.avatar ? (
          <Image
            source={{ uri: member.avatar }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25
            }}
            resizeMode="cover"
            onError={(error) => {
              console.log('Error loading member avatar:', member.name, error);
            }}
            onLoad={() => {
              console.log('Successfully loaded avatar for:', member.name);
            }}
          />
        ) : (
          <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600' }}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#EEEEEE', fontSize: 16, fontWeight: '500' }}>
            {member.name}
          </Text>
          {member.isCurrentUser && (
            <Text style={{ color: '#00ADB5', fontSize: 12, marginLeft: 8 }}>
              (You)
            </Text>
          )}
        </View>
        <Text style={{ color: '#EEEEEE', opacity: 0.7, fontSize: 14 }}>
          {member.email}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: '#EEEEEE', opacity: 0.5, fontSize: 12 }}>
            {member.role} • Last active: {member.lastActive.toLocaleString()}
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {!member.isCurrentUser && (
          <TouchableOpacity
            onPress={() => removeMember(member)}
            style={{
              padding: 8,
              marginRight: 8
            }}
          >
            <MaterialCommunityIcons name="account-remove" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
        <View style={{
          backgroundColor: member.isCurrentUser ? '#4CAF50' : '#FFA726',
          width: 12,
          height: 12,
          borderRadius: 6
        }} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#EEEEEE', fontSize: 16 }}>Loading profile...</Text>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          paddingTop: Math.max(insets.top + 16, 60),
          backgroundColor: '#212121',
          borderBottomWidth: 1,
          borderBottomColor: '#3A4750'
        }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#EEEEEE" />
          </TouchableOpacity>
          <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600', flex: 1 }}>
            Profile & Household
          </Text>
          <MaterialCommunityIcons name="account" size={24} color="#00ADB5" />
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={{
            alignItems: 'center',
            marginBottom: 20,
            paddingHorizontal: 16
          }}>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: profile.avatar ? 'transparent' : '#00ADB5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#00ADB5',
                  overflow: 'hidden'
                }}
              >
                {profile.avatar ? (
                  <Image
                    source={{ uri: profile.avatar }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 57
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ 
                    color: '#EEEEEE', 
                    fontSize: 48, 
                    fontWeight: '600' 
                  }}>
                    {(profile.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
                
                {/* Camera overlay */}
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#00ADB5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: '#212121'
                }}>
                  <MaterialCommunityIcons name="camera" size={18} color="#EEEEEE" />
                </View>
              </TouchableOpacity>
              
              {/* Remove button */}
              {profile.avatar && (
                <TouchableOpacity
                  onPress={removeImage}
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: '#FF6B6B',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#212121'
                  }}
                >
                  <MaterialCommunityIcons name="close" size={16} color="#EEEEEE" />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={{ 
              color: '#EEEEEE', 
              fontSize: 16, 
              fontWeight: '600',
              marginTop: 12
            }}>
              {profile.name || 'Your Name'}
            </Text>
            
            <TouchableOpacity
              onPress={pickImage}
              style={{
                marginTop: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: '#00ADB520',
                borderWidth: 1,
                borderColor: '#00ADB5'
              }}
            >
              <Text style={{ color: '#00ADB5', fontSize: 14 }}>
                {profile.avatar ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Debug Button - Only for Admin Users */}
          {householdMembers.some(member => member.isCurrentUser && member.role === 'Admin') && (
            <TouchableOpacity
              onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                console.log('🔍 Current user:', user?.email, user?.id);
                
                const { data: members, error } = await supabase
                  .from('household_members')
                  .select('*')
                  .eq('householdId', HOUSEHOLD_ID);
                
                console.log('🏠 Household members:', members?.length || 0, members);
                console.log('❌ Error:', error?.message);
                
                // Check member avatars
                const membersWithAvatars = members?.filter(m => m.avatar) || [];
                console.log('👤 Members with avatars:', membersWithAvatars.length);
                membersWithAvatars.forEach(m => {
                  console.log(`  - ${m.name}: ${m.avatar ? 'HAS AVATAR' : 'NO AVATAR'}`);
                });
                
                // Check current profile avatar
                console.log('📱 Current profile avatar:', profile.avatar || 'NULL');
                
                Alert.alert(
                  'Debug Info', 
                  `User: ${user?.email}\nMembers: ${members?.length || 0}\nWith Avatars: ${membersWithAvatars.length}\nProfile Avatar: ${profile.avatar ? 'YES' : 'NO'}\nCheck console for details`,
                  [
                    { text: 'OK' },
                    { 
                      text: 'Sync Avatar', 
                      onPress: async () => {
                        if (profile.avatar && profile.name) {
                          console.log('🔄 Force syncing avatar to database...');
                          const syncResult = await saveHouseholdMember({
                            name: profile.name,
                            email: profile.email,
                            avatar: profile.avatar,
                            role: 'admin'
                          });
                          console.log('Sync result:', syncResult);
                          loadHouseholdMembers();
                          Alert.alert('Sync Complete', `Avatar sync ${syncResult.success ? 'successful' : 'failed'}`);
                        } else {
                          Alert.alert('No Avatar', 'No profile avatar to sync');
                        }
                      }
                    }
                  ]
                );
              }}
              style={{
                backgroundColor: '#FF6B6B',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                marginTop: 16,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#EEEEEE', fontWeight: '600' }}>🔍 Debug Household (Admin)</Text>
            </TouchableOpacity>
          )}

          {/* Personal Info */}
          {renderSection('👤 Personal Information', (
            <>
              {renderTextInput(
                'Full Name',
                profile.name,
                (text) => updateProfile('name', text),
                'Enter your full name'
              )}
              {renderTextInput(
                'Email Address',
                profile.email,
                (text) => updateProfile('email', text),
                'Enter your email'
              )}
              {renderTextInput(
                'Phone Number',
                profile.phone,
                (text) => updateProfile('phone', text),
                'Enter your phone number'
              )}
            </>
          ))}

          {/* Location Preferences */}
          {renderSection('📍 Location Preferences', (
            <>
              {renderTextInput(
                'Default Location',
                profile.preferences.defaultLocation,
                (text) => updatePreference('defaultLocation', text),
                'Your primary location (e.g., Home address)'
              )}
              {renderTextInput(
                'Work Location',
                profile.preferences.workLocation,
                (text) => updatePreference('workLocation', text),
                'Your work address'
              )}
            </>
          ))}



          {/* Household Members */}
          {renderSection('👥 Household Members', (
            <>
              <Text style={{ color: '#EEEEEE', opacity: 0.8, fontSize: 14, marginBottom: 16 }}>
                People who share this calendar with you:
              </Text>
              {householdMembers.map(renderMember)}
              
              <TouchableOpacity
                style={{
                  backgroundColor: '#00ADB5',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 12
                }}
                onPress={showInviteMemberDialog}
              >
                <MaterialCommunityIcons name="account-plus" size={18} color="#EEEEEE" />
                <Text style={{
                  color: '#EEEEEE',
                  fontSize: 14,
                  fontWeight: '500',
                  marginLeft: 8
                }}>
                  Invite New Member
                </Text>
              </TouchableOpacity>
            </>
          ))}

          {/* Household Info */}
          {renderSection('🏠 Household Information', (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#EEEEEE', fontSize: 14, marginBottom: 8 }}>
                  Household ID
                </Text>
                <View style={{
                  backgroundColor: '#212121',
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#555',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#EEEEEE', flex: 1, fontFamily: 'monospace' }}>
                    {HOUSEHOLD_ID}
                  </Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Copied!', 'Household ID copied to clipboard')}
                  >
                    <MaterialCommunityIcons name="content-copy" size={20} color="#00ADB5" />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: '#EEEEEE', opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                  Share this ID with others to join your household
                </Text>
              </View>
              
              <View style={{
                backgroundColor: '#4CAF5020',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#4CAF50',
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#4CAF50" />
                <Text style={{ color: '#4CAF50', fontSize: 14, marginLeft: 8, flex: 1 }}>
                  Your calendar is synced and secure
                </Text>
              </View>
            </>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            onPress={saveProfile}
            disabled={saving}
            style={{
              backgroundColor: '#00ADB5',
              marginHorizontal: 16,
              marginTop: 20,
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons 
              name={saving ? "loading" : "content-save"} 
              size={20} 
              color="#EEEEEE" 
            />
            <Text style={{
              color: '#EEEEEE',
              fontSize: 16,
              fontWeight: '600',
              marginLeft: 8
            }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
