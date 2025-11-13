import React from 'react';
import moment from 'moment';
import { FaFile, FaMapMarkerAlt, FaUser } from 'react-icons/fa';

function MessageCard({ message, me, other, users, searchQuery = '' }) {
  console.log('Rendering message:', message);
  const isMessageFromMe = message.sender_id === me.id;

  const formatTimeAgo = (timestamp) => {
    const momentDate = moment(timestamp);
    return momentDate.fromNow();
  };

  const renderMessageContent = () => {
    console.log('Rendering content for message:', message);
    console.log('Message has file_url:', !!message.file_url, 'file_type:', message.file_type);
    console.log('Message has location_lat:', message.location_lat, 'location_lng:', message.location_lng);
    console.log('Message has contact_user_id:', message.contact_user_id);

    // Image message (legacy support)
    if (message.image_url && !message.file_url) {
      console.log('Rendering legacy image:', message.image_url);
      return <img src={message.image_url} className='max-h-60 w-60 mb-4 rounded-lg shadow-md' />;
    }

    // File message
    if (message.file_url) {
      console.log('Rendering file:', message.file_url, 'Type:', message.file_type);
      const isImage = message.file_type?.startsWith('image/');
      const isVideo = message.file_type?.startsWith('video/');
      const isAudio = message.file_type?.startsWith('audio/');

      if (isImage) {
        console.log('Rendering image file:', message.file_url);
        return (
          <div>
            <img
              src={message.file_url}
              className='max-h-60 w-60 mb-2 rounded-lg shadow-md'
              onLoad={() => console.log('Image loaded successfully')}
              onError={(e) => console.log('Image failed to load:', e)}
              alt="Uploaded image"
            />
            <p className='text-xs opacity-75'>📷 Image</p>
          </div>
        );
      } else if (isVideo) {
        console.log('Rendering video file:', message.file_url);
        return (
          <div>
            <video
              src={message.file_url}
              controls
              className='max-h-60 w-60 mb-2 rounded-lg shadow-md'
              preload='metadata'
              onError={(e) => console.log('Video failed to load:', e)}
              onLoadStart={() => console.log('Video started loading')}
            />
            <p className='text-xs opacity-75'>🎥 Video</p>
          </div>
        );
      } else if (isAudio) {
        console.log('Rendering audio file:', message.file_url);
        return (
          <div>
            <audio src={message.file_url} controls className='mb-2' />
            <p className='text-xs opacity-75'>🎵 Audio</p>
          </div>
        );
      } else {
        console.log('Rendering document file:', message.file_url);
        return (
          <div>
            <a
              href={message.file_url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              <FaFile className='mr-2 text-gray-600' />
              <span className='text-blue-600 underline text-sm'>Download File</span>
            </a>
            <p className='text-xs opacity-75 mt-1'>📄 Document</p>
          </div>
        );
      }
    }

    // Location message
    if (message.location_lat && message.location_lng) {
      console.log('Rendering location:', message.location_lat, message.location_lng);
      const mapsUrl = `https://www.google.com/maps?q=${message.location_lat},${message.location_lng}`;
      return (
        <div>
          <a
            href={mapsUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors'
          >
            <FaMapMarkerAlt className='mr-2 text-blue-600' />
            <span className='text-blue-600 underline text-sm'>View Location</span>
          </a>
          <p className='text-xs opacity-75 mt-1'>📍 Location</p>
        </div>
      );
    }

    // Contact message
    if (message.contact_user_id) {
      console.log('Rendering contact:', message.contact_user_id);
      const contactUser = users?.find(u => u.id === message.contact_user_id);
      if (contactUser) {
        return (
          <div>
            <div className='flex items-center p-2 bg-green-100 rounded-lg'>
              <img src={contactUser.avatar_url} alt={contactUser.name} className='w-8 h-8 rounded-full mr-2' />
              <div>
                <div className='font-semibold text-green-800 text-sm'>{contactUser.name}</div>
                <div className='text-xs text-green-600'>👤 Contact</div>
              </div>
            </div>
            <p className='text-xs opacity-75 mt-1'>👤 Contact</p>
          </div>
        );
      } else {
        return (
          <div>
            <div className='flex items-center p-2 bg-green-100 rounded-lg'>
              <FaUser className='mr-2 text-green-600' />
              <span className='text-green-600 text-sm'>Shared Contact</span>
            </div>
            <p className='text-xs opacity-75 mt-1'>👤 Contact</p>
          </div>
        );
      }
    }

    // Text message
    if (message.content) {
      const highlightText = (text, query) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
          regex.test(part) ? <mark key={index} className='bg-yellow-300 text-black px-1 rounded'>{part}</mark> : part
        );
      };

      return <p className='text-sm leading-relaxed'>{highlightText(message.content, searchQuery)}</p>;
    }

    // Fallback for messages with no content
    return <p className='text-sm opacity-75 italic'>📎 Media message</p>;
  };

  return (
    <div key={message.id} className={`flex mb-4 ${isMessageFromMe ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar on the left or right based on the sender */}
      <div className={`w-10 h-10 ${isMessageFromMe ? 'ml-2 mr-2' : 'mr-2'} transition-transform duration-200 hover:scale-110`}>
        {isMessageFromMe && (
          <img
            key={me?.avatar_url} // Force re-render when avatar changes
            className='w-full h-full object-cover rounded-full shadow-lg ring-2 ring-blue-200'
            src={me?.avatar_url || '/default-avatar.png'}
            alt='Avatar'
          />
        )}
        {!isMessageFromMe && (
          <img
            key={other?.avatar_url} // Force re-render when avatar changes
            className='w-full h-full object-cover rounded-full shadow-lg ring-2 ring-green-200'
            src={other?.avatar_url || '/default-avatar.png'}
            alt='Avatar'
          />
        )}
      </div>

      {/* Message bubble on the right or left based on the sender */}
      <div className={`p-3 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ${
        isMessageFromMe
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 self-end hover:from-blue-600 hover:to-blue-700 text-white'
          : 'bg-gradient-to-r from-green-500 to-green-600 self-start hover:from-green-600 hover:to-green-700 text-white'
      }`}>
        {renderMessageContent()}
        <div className={`text-xs mt-1 opacity-75 ${isMessageFromMe ? 'text-blue-100' : 'text-green-100'}`}>{formatTimeAgo(message.created_at)}</div>
      </div>
    </div>
  );
}

export default MessageCard;
