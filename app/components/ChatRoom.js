import React,{useState,useEffect,useRef} from 'react';
import MessageCard from './MessageCard';
import MessageInput from './MessageInput';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { FaSync, FaSearch, FaTimes } from 'react-icons/fa';

function ChatRoom({ user ,selectedChatroom, users}) {
  const [me, setMe] = useState(selectedChatroom?.myData);
  const [other, setOther] = useState(selectedChatroom?.otherData);
  const chatRoomId = selectedChatroom?.id;

  // Update local state when selectedChatroom changes
  useEffect(() => {
    setMe(selectedChatroom?.myData);
    setOther(selectedChatroom?.otherData);
  }, [selectedChatroom]);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesContainerRef = useRef(null);
  const [image, setImage] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedFileFile, setSelectedFileFile] = useState(null);
  const [selectedMediaFile, setSelectedMediaFile] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);

  useEffect(() => {
    // Scroll to the bottom when messages change
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Filter messages based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(message =>
        message.content && message.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchQuery]);

  // Listen for file modal open event from MessageInput
  useEffect(() => {
    const handleOpenFileModal = () => {
      setShowFileModal(true);
    };

    const handleOpenMediaModal = () => {
      setShowMediaModal(true);
    };

    const handleOpenContactModal = () => {
      setShowContactModal(true);
    };

    window.addEventListener('openFileModal', handleOpenFileModal);
    window.addEventListener('openMediaModal', handleOpenMediaModal);
    window.addEventListener('openContactModal', handleOpenContactModal);

    return () => {
      window.removeEventListener('openFileModal', handleOpenFileModal);
      window.removeEventListener('openMediaModal', handleOpenMediaModal);
      window.removeEventListener('openContactModal', handleOpenContactModal);
    };
  }, []);

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return null;

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `files/${fileName}`;

      console.log('Starting upload for file:', selectedFile.name, 'Type:', selectedFile.type, 'Size:', selectedFile.size);

      // Check file size (limit to 50MB for videos)
      const maxSize = selectedFile.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        const maxSizeMB = selectedFile.type.startsWith('video/') ? 50 : 10;
        alert(`File size too large. Maximum size for ${selectedFile.type.startsWith('video/') ? 'videos' : 'files'} is ${maxSizeMB}MB.`);
        return null;
      }

      try {
        console.log('Attempting upload to chat-files bucket...');
        const { data, error } = await supabase.storage
          .from('chat-files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Supabase storage error:', error);
          console.error('Error details:', {
            message: error.message,
            statusCode: error.statusCode,
            error: error.error
          });

          // Try alternative bucket if chat-files doesn't exist
          if (error.message?.includes('not found') || error.message?.includes('bucket')) {
            console.log('Trying alternative bucket: chat-images');
            const altFilePath = `files/${fileName}`;
            const { data: altData, error: altError } = await supabase.storage
              .from('chat-images')
              .upload(altFilePath, selectedFile, {
                cacheControl: '3600',
                upsert: false
              });

            if (altError) {
              console.error('Alternative bucket also failed:', altError);
              alert(`Upload failed: Both storage buckets unavailable. Please check Supabase storage setup.`);
              return null;
            }

            const { data: { publicUrl: altPublicUrl } } = supabase.storage
              .from('chat-images')
              .getPublicUrl(altFilePath);

            console.log('File uploaded to alternative bucket:', altPublicUrl);
            return { url: altPublicUrl, type: selectedFile.type };
          }

          alert(`Upload failed: ${error.message}`);
          return null;
        }

        console.log('Upload successful, getting public URL...');

        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        console.log('File uploaded successfully:', publicUrl);
        return { url: publicUrl, type: selectedFile.type };
      } catch (uploadError) {
        console.error('Upload exception:', uploadError);
        alert(`Upload failed: ${uploadError.message}`);
        return null;
      }
    } catch (error) {
      console.error('Unexpected error during file upload:', error);
      alert(`Upload failed: ${error.message}`);
      return null;
    }
  };

// Manual refresh function for avatars and online status (since real-time isn't working)
const refreshAvatars = async () => {
  console.log('🔄 Refresh button clicked!');
  setRefreshing(true);
  try {
    console.log('🔄 Starting avatar refresh...');
    console.log('🔄 Current me:', me);
    console.log('🔄 Current other:', other);

    const { data: updatedUsers, error } = await supabase
      .from('users')
      .select('id, avatar_url, is_online')
      .in('id', [me?.id, other?.id]);

    if (error) {
      console.error('Error refreshing avatars:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      toast.error(`Failed to refresh avatars: ${error.message}`);
      return;
    }

    console.log('🔄 Fetched updated users:', updatedUsers);

    // Update me and other with fresh avatar data and online status
    const updatedMe = updatedUsers.find(u => u.id === me?.id);
    const updatedOther = updatedUsers.find(u => u.id === other?.id);

    console.log('🔄 updatedMe:', updatedMe);
    console.log('🔄 updatedOther:', updatedOther);

    if (updatedMe) {
      console.log('🔄 Refreshed my avatar to:', updatedMe.avatar_url, 'online:', updatedMe.is_online);
      setMe(prev => ({ ...prev, avatar_url: updatedMe.avatar_url, is_online: updatedMe.is_online }));
    }
    if (updatedOther) {
      console.log('🔄 Refreshed other avatar to:', updatedOther.avatar_url, 'online:', updatedOther.is_online);
      console.log('🔄 Previous other state:', other);
      setOther(prev => {
        const newState = { ...prev, avatar_url: updatedOther.avatar_url, is_online: updatedOther.is_online };
        console.log('🔄 New other state:', newState);
        // Force re-render by updating lastUpdate
        setLastUpdate(Date.now());
        return newState;
      });
    }

    setLastUpdate(Date.now());
    console.log('🔄 Final state after refresh - me:', me, 'other:', other);
    console.log('🔄 UI should now show:', other?.is_online ? 'Active now' : 'Offline');
    toast.success('Avatars and status refreshed!');
  } catch (error) {
    console.error('Error in refreshAvatars:', error);
    toast.error('Failed to refresh avatars');
  } finally {
    setRefreshing(false);
  }
};

//get messages
useEffect(() => {
  if(!chatRoomId) return;

  // Clear messages when switching chat rooms
  setMessages([]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      console.log('Fetched messages:', data);
      console.log('Sample message structure:', data?.[0]);
      setMessages(data || []);
    }
  };
  fetchMessages();

  // Set up polling as backup for real-time (reduced frequency for better performance)
  const pollInterval = setInterval(fetchMessages, 10000); // Poll every 10 seconds as backup

  // Subscribe to real-time changes with optimized settings
  const messagesChannel = supabase
    .channel(`messages-${chatRoomId}`, {
      config: {
        presence: { key: user.id },
        broadcast: { self: true },
      },
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_room_id=eq.${chatRoomId}`,
    }, (payload) => {
      console.log('Real-time INSERT event received:', payload.new);
      // Avoid duplicate if optimistic update already added it
      setMessages(prev => {
        const exists = prev.some(m => m.id === payload.new.id);
        if (!exists) {
          console.log('Adding new message to UI:', payload.new);
          return [...prev, payload.new];
        } else {
          console.log('Message already exists in UI, skipping duplicate');
          return prev;
        }
      });
      setLastUpdate(Date.now());
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `chat_room_id=eq.${chatRoomId}`,
    }, (payload) => {
      console.log('Real-time UPDATE event:', payload.new);
      setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'messages',
      filter: `chat_room_id=eq.${chatRoomId}`,
    }, (payload) => {
      console.log('Real-time DELETE event:', payload.old);
      setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
    })
    .subscribe((status, err) => {
      console.log('Messages subscription status:', status, err);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to real-time message updates for chat:', chatRoomId);
        toast.success('Real-time updates active');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time subscription error:', err);
        toast.error('Real-time updates failed - using polling fallback');
      } else if (status === 'TIMED_OUT') {
        console.warn('⚠️ Real-time subscription timed out - reconnecting...');
      } else if (status === 'CLOSED') {
        console.log('ℹ️ Real-time subscription closed');
      }
    });

  // Auto-refresh avatars every 30 seconds
  const avatarInterval = setInterval(refreshAvatars, 30000); // 30 seconds

  return () => {
    console.log('Cleaning up subscriptions and polling');
    clearInterval(pollInterval);
    clearInterval(avatarInterval);
    supabase.removeChannel(messagesChannel);
  };
}, [chatRoomId]);

//put messages in db
 const sendMessage = async (content = null, imageUrl = null, fileType = null, location = null, contactUserId = null, fileUrl = null) => {
    console.log('sendMessage called with:', { content, imageUrl, fileType, location, contactUserId, fileUrl });
    // Check if there's something to send
    const hasContent = content || message.trim();
    const hasImage = image;
    const hasFile = fileUrl;
    const hasLocation = location;
    const hasContact = contactUserId;

    if (!hasContent && !hasImage && !hasFile && !hasLocation && !hasContact) {
      console.log('No message to send');
      return;
    }

    const messageContent = hasContent ? (content || message.trim()) : null;
    const messageImage = hasImage ? image : imageUrl || null;
    const messageFileUrl = fileUrl || null;
    const messageFileType = fileType || null;
    const messageLocation = location || null;
    const messageContact = contactUserId || null;

    console.log('Sending message:', {
      chatRoomId,
      senderId: me.id,
      content: messageContent,
      image: messageImage,
      fileUrl: messageFileUrl,
      fileType: messageFileType,
      location: messageLocation,
      contactUserId: messageContact
    });

    console.log('Message data being inserted:', {
      chat_room_id: chatRoomId,
      sender_id: me.id,
      content: messageContent,
      image_url: messageImage,
      file_url: messageFileUrl,
      file_type: messageFileType,
      location_lat: messageLocation?.lat || null,
      location_lng: messageLocation?.lng || null,
      contact_user_id: messageContact,
    });

    try {
      // Add a new message to the Supabase table
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            chat_room_id: chatRoomId,
            sender_id: me.id,
            content: messageContent,
            image_url: messageImage,
            file_url: messageFileUrl,
            file_type: messageFileType,
            location_lat: messageLocation?.lat || null,
            location_lng: messageLocation?.lng || null,
            contact_user_id: messageContact,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error(`Failed to send message: ${error.message}`);
        return;
      }

      console.log('Message sent successfully:', data);
      toast.success('Message sent!');

      // Optimistically add message to state for instant UI update (prevents duplicate with real-time)
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);

      // Clear the input immediately
      setMessage('');
      setImage('');

      // Update last message in chatroom
      let lastMessageText = messageContent;
      if (messageImage) lastMessageText = "📷 Image";
      else if (messageFileUrl) {
        if (messageFileType?.startsWith('image/')) lastMessageText = "🖼️ Image";
        else if (messageFileType?.startsWith('video/')) lastMessageText = "🎥 Video";
        else if (messageFileType?.startsWith('audio/')) lastMessageText = "🎵 Audio";
        else lastMessageText = "📄 Document";
      }
      else if (messageLocation) lastMessageText = "📍 Location";
      else if (messageContact) lastMessageText = "👤 Contact";

      const { error: updateError } = await supabase
        .from('chatrooms')
        .update({ last_message: lastMessageText })
        .eq('id', chatRoomId);

      if (updateError) {
        console.error('Error updating last message:', updateError);
      }

    } catch (error) {
      console.error('Error sending message:', error.message);
      toast.error(`Failed to send message: ${error.message}`);
    }

    // Scroll to the bottom after sending a message
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }


  return (
    <div className='flex flex-col h-screen bg-gradient-to-b from-blue-50 to-purple-50 relative'>
      {/* Header */}
      <div className='bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center'>
            <img
              key={other?.avatar_url} // Force re-render when avatar changes
              className='w-10 h-10 object-cover rounded-full mr-3'
              src={other?.avatar_url || '/default-avatar.png'}
              alt='Avatar'
            />
            <div>
              <h2 className='text-lg font-semibold text-gray-800'>{other.name}</h2>
              <p className='text-sm text-gray-500'>
                {other?.is_online !== undefined ? (other.is_online ? 'Active now' : 'Offline') : 'Loading...'} • Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            {showSearch && (
              <div className='flex items-center space-x-2'>
                <input
                  type='text'
                  placeholder='Search messages...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className='bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-full transition-all duration-300 hover:scale-110'
                  title='Clear search'
                >
                  <FaTimes className='text-sm' />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                showSearch ? 'bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title='Search messages'
            >
              <FaSearch className='text-sm' />
            </button>
            <button
              onClick={refreshAvatars}
              disabled={refreshing}
              className='bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-50'
              title='Refresh avatars'
            >
              <FaSync className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages container with overflow and scroll */}
      <div ref={messagesContainerRef} className='flex-1 overflow-y-auto p-4 space-y-4'>
        {filteredMessages?.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center'>
              {searchQuery.trim() !== '' ? (
                <>
                  <div className='text-6xl mb-4'>🔍</div>
                  <h3 className='text-xl font-semibold text-gray-600 mb-2'>No messages found</h3>
                  <p className='text-gray-500'>No messages match your search for "{searchQuery}".</p>
                </>
              ) : (
                <>
                  <div className='text-6xl mb-4'>💬</div>
                  <h3 className='text-xl font-semibold text-gray-600 mb-2'>Start a conversation!</h3>
                  <p className='text-gray-500'>Send a message to {other.name} to begin chatting.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <MessageCard key={message.id} message={message} me={me} other={other} users={users} searchQuery={searchQuery}/>
          ))
        )}
      </div>

      {/* Media Upload Modal - positioned over the chatroom */}
      {showMediaModal && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-300'>
            <h3 className='font-bold text-2xl mb-6 text-center text-gray-800'>📷 Upload Media</h3>
            <div className='mb-6'>
              <input
                type='file'
                accept='image/*,video/*,audio/*,.gif'
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    console.log('Selected media file:', file.name, 'Size:', file.size, 'Type:', file.type);
                    setSelectedMediaFile(file);
                  }
                }}
                className='file-input file-input-bordered w-full'
              />
              {selectedMediaFile && (
                <div className='mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <p className='text-base font-medium text-blue-800'>📄 {selectedMediaFile.name}</p>
                  <p className='text-sm text-blue-600'>📏 {(selectedMediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
            <div className='flex justify-center space-x-4'>
              <button
                onClick={async () => {
                  if (selectedMediaFile) {
                    const result = await handleFileUpload(selectedMediaFile);
                    if (result) {
                      sendMessage(null, null, null, null, null, result.url, result.type);
                      setShowMediaModal(false);
                      setSelectedMediaFile(null);
                    } else {
                      alert('Failed to upload media. Please try again.');
                    }
                  }
                }}
                className='btn btn-primary px-8 py-3'
                disabled={!selectedMediaFile}
              >
                🚀 Upload
              </button>
              <button onClick={() => { setShowMediaModal(false); setSelectedMediaFile(null); }} className='btn btn-outline px-8 py-3'>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Selection Modal - positioned over the chatroom */}
      {showContactModal && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-300'>
            <h3 className='font-bold text-2xl mb-6 text-center text-gray-800'>👥 Share Contact</h3>
            <div className='mb-6 max-h-60 overflow-y-auto'>
              {users?.filter(user => user.id !== user?.id).map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedContact(user)}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedContact?.id === user.id
                      ? 'bg-blue-100 border-2 border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className='flex items-center'>
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className='w-10 h-10 rounded-full mr-3'
                    />
                    <div>
                      <p className='font-medium text-gray-800'>{user.name}</p>
                      <p className='text-sm text-gray-500'>{user.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className='flex justify-center space-x-4'>
              <button
                onClick={() => {
                  if (selectedContact) {
                    sendMessage(null, null, null, null, selectedContact.id);
                    setShowContactModal(false);
                    setSelectedContact(null);
                  }
                }}
                className='btn btn-primary px-8 py-3'
                disabled={!selectedContact}
              >
                📤 Share Contact
              </button>
              <button onClick={() => {
                setShowContactModal(false);
                setSelectedContact(null);
              }} className='btn btn-outline px-8 py-3'>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal - positioned over the chatroom */}
      {showFileModal && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-blue-300'>
            <h3 className='font-bold text-2xl mb-6 text-center text-gray-800'>📎 Upload Document</h3>
            <div className='mb-6'>
              <input
                type='file'
                accept='.pdf,.doc,.docx,.txt,.zip,.rar,.xlsx,.xls,.ppt,.pptx'
                onChange={(e) => setSelectedFileFile(e.target.files[0])}
                className='file-input file-input-bordered w-full'
              />
              {selectedFileFile && (
                <div className='mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <p className='text-base font-medium text-blue-800'>📄 {selectedFileFile.name}</p>
                  <p className='text-sm text-blue-600'>📏 {(selectedFileFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
            <div className='flex justify-center space-x-4'>
              <button
                onClick={async () => {
                  if (selectedFileFile) {
                    console.log('Starting document upload for:', selectedFileFile.name);
                    const result = await handleFileUpload(selectedFileFile);
                    if (result) {
                      console.log('Document upload successful, sending message with file_url:', result.url, 'file_type:', result.type);
                      sendMessage(null, null, null, null, null, result.url, result.type);
                      setShowFileModal(false);
                      setSelectedFileFile(null);
                    } else {
                      console.error('Document upload failed');
                      alert('Failed to upload file. Please try again.');
                    }
                  }
                }}
                className='btn btn-primary px-8 py-3'
                disabled={!selectedFileFile}
              >
                🚀 Upload
              </button>
              <button onClick={() => {
                setShowFileModal(false);
                setSelectedFileFile(null);
              }} className='btn btn-outline px-8 py-3'>❌ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Input box at the bottom */}
      <MessageInput sendMessage={sendMessage} message={message} setMessage={setMessage} image={image} setImage={setImage} users={users}/>
    </div>
  );
}

export default ChatRoom;
