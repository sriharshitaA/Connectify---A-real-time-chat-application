import React, { useState } from 'react';
import { FaPaperclip, FaPaperPlane, FaMapMarkerAlt, FaUser, FaCamera } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import EmojiPicker from 'emoji-picker-react';

function MessageInput({ sendMessage, message, setMessage,image,setImage, users }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [location, setLocation] = useState(null);







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

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          sendMessage(null, null, null, { lat: latitude, lng: longitude }, null, null);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser settings.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setShowContactModal(false);
    sendMessage(null, null, null, null, contact.id, null);
  };

  const handleEmojiClick = (emojiData, event) => {
    // Append the selected emoji to the message state
    setMessage((prevMessage) => prevMessage + emojiData.emoji);
    setShowEmojiPicker(false); // Close emoji picker after selection
  };

  return (
    <div className='relative flex items-center p-4 border-t border-gray-200 bg-white/90 backdrop-blur-sm'>
      {/* Media Upload Button - Now handled by ChatRoom */}
      <button
        onClick={() => {
          // This will be handled by the parent ChatRoom component
          const event = new CustomEvent('openMediaModal');
          window.dispatchEvent(event);
        }}
        className='text-gray-500 mr-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:text-blue-500 p-2 rounded-full hover:bg-blue-100'
        title='Upload Media'
      >
        <FaCamera className='text-lg' />
      </button>

      {/* File Upload Button - Now handled by ChatRoom */}
      <button
        onClick={() => {
          // This will be handled by the parent ChatRoom component
          const event = new CustomEvent('openFileModal');
          window.dispatchEvent(event);
        }}
        className='text-gray-500 mr-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:text-green-500 p-2 rounded-full hover:bg-green-100'
        title='Upload File'
      >
        <FaPaperclip className='text-lg' />
      </button>

      {/* Location Share Button */}
      <button
        onClick={handleLocationShare}
        className='text-gray-500 mr-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:text-red-500 p-2 rounded-full hover:bg-red-100'
        title='Share Location'
      >
        <FaMapMarkerAlt className='text-lg' />
      </button>

      {/* Contact Share Button - Now handled by ChatRoom */}
      <button
        onClick={() => {
          // This will be handled by the parent ChatRoom component
          const event = new CustomEvent('openContactModal');
          window.dispatchEvent(event);
        }}
        className='text-gray-500 mr-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:text-purple-500 p-2 rounded-full hover:bg-purple-100'
        title='Share Contact'
      >
        <FaUser className='text-lg' />
      </button>

       {/* Emoji Picker Button */}
      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className='transition-all duration-300 hover:scale-110 hover:bg-yellow-100 p-2 rounded-full'
      >
        😊
      </button>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage(message)}
        type='text'
        placeholder='Type a message...'
        className='flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2'
      />

      <button
        onClick={() => sendMessage(message)}
        className='bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-full hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-xl'
      >
        <FaPaperPlane className='text-lg' />
      </button>

      {showEmojiPicker && (
        <div className='absolute right-0 bottom-full p-2'>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            disableAutoFocus={true}
          />
        </div>
      )}








    </div>
  );
}

export default MessageInput;