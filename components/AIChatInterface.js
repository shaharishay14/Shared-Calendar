import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import aiPlannerService from '../services/aiPlannerService';

const AIChatInterface = ({ weekPlan, preferences, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      const initialized = await aiPlannerService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        // Add welcome message
        const welcomeMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Hello! I'm your AI week planning assistant. I can help you optimize your schedule, suggest the best sleep locations, recommend when to use public transport, and much more.

Here are some things you can ask me:
• "How can I minimize driving this week?"
• "Where should I sleep each night?"
• "When should I use the train instead of driving?"
• "What are the potential stress points in my schedule?"
• "How can we maximize time together this week?"

What would you like to know about your week?`,
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      } else {
        Alert.alert(
          'AI Not Configured', 
          'Please configure your OpenAI API key in the settings first.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Failed to initialize AI chat:', error);
      Alert.alert('Error', 'Failed to initialize AI assistant');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare conversation history for AI
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Get AI response
      const response = await aiPlannerService.chatWithAI(
        userMessage.content,
        weekPlan,
        preferences,
        conversationHistory
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.success ? response.message : `Sorry, I encountered an error: ${response.error}`,
        timestamp: new Date().toISOString(),
        usage: response.usage
      };

      setMessages(prev => [...prev, aiMessage]);

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={{
      marginHorizontal: 16,
      marginVertical: 8,
      alignSelf: item.type === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%'
    }}>
      <View style={{
        backgroundColor: item.type === 'user' ? '#00ADB5' : '#3A4750',
        padding: 12,
        borderRadius: 16,
        borderBottomRightRadius: item.type === 'user' ? 4 : 16,
        borderBottomLeftRadius: item.type === 'user' ? 16 : 4,
      }}>
        <Text style={{
          color: '#EEEEEE',
          fontSize: 14,
          lineHeight: 20
        }}>
          {item.content}
        </Text>
        
        <Text style={{
          color: '#EEEEEE',
          opacity: 0.6,
          fontSize: 10,
          marginTop: 4,
          textAlign: item.type === 'user' ? 'right' : 'left'
        }}>
          {new Date(item.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  const renderQuickActions = () => {
    const quickActions = aiPlannerService.getConversationStarters(weekPlan);
    
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ 
          color: '#EEEEEE', 
          fontSize: 12, 
          opacity: 0.7, 
          marginBottom: 8 
        }}>
          Quick questions:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {quickActions.slice(0, 3).map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setInputText(action)}
              style={{
                backgroundColor: '#555',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                marginBottom: 8
              }}
            >
              <Text style={{ color: '#EEEEEE', fontSize: 12 }}>
                {action}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (!isInitialized) {
    return (
      <LinearGradient colors={["#212121", "#212121"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00ADB5" />
          <Text style={{ color: '#EEEEEE', marginTop: 16 }}>
            Initializing AI assistant...
          </Text>
        </View>
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
          paddingTop: Math.max(insets.top + 10, 50),
          borderBottomWidth: 1,
          borderBottomColor: '#3A4750',
          backgroundColor: '#212121'
        }}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
            <MaterialCommunityIcons name="close" size={24} color="#EEEEEE" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#EEEEEE', fontSize: 18, fontWeight: '600' }}>
              AI Week Planner
            </Text>
            <Text style={{ color: '#00ADB5', fontSize: 12 }}>
              Powered by OpenAI
            </Text>
          </View>
          <MaterialCommunityIcons name="robot" size={24} color="#00ADB5" />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Loading indicator */}
        {isLoading && (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: 16, 
            paddingVertical: 8 
          }}>
            <ActivityIndicator size="small" color="#00ADB5" />
            <Text style={{ color: '#EEEEEE', marginLeft: 8, fontSize: 12 }}>
              AI is thinking...
            </Text>
          </View>
        )}

        {/* Quick actions (show only if no messages yet or few messages) */}
        {messages.length <= 2 && renderQuickActions()}

        {/* Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: '#3A4750',
          backgroundColor: '#212121'
        }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me about your week plan..."
            placeholderTextColor="#888"
            multiline
            style={{
              flex: 1,
              backgroundColor: '#3A4750',
              color: '#EEEEEE',
              padding: 12,
              borderRadius: 20,
              maxHeight: 100,
              marginRight: 12
            }}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            style={{
              backgroundColor: inputText.trim() && !isLoading ? '#00ADB5' : '#555',
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <MaterialCommunityIcons 
              name="send" 
              size={20} 
              color="#EEEEEE" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default AIChatInterface;
