import React from 'react';

function UsersCard({ avatarUrl, name, latestMessage, time,type, is_online }) {
  return (
    <div className="flex items-center p-4 border-b border-gray-200 relative hover:cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-md hover:scale-[1.02]">

      {/* Avatar on the left */}
      <div className="flex-shrink-0 mr-4 relative">
        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 transition-all duration-300 hover:ring-blue-300 hover:scale-110">
          <img
            key={avatarUrl + Date.now()} // Force re-render when avatar changes
            className="w-full h-full object-cover"
            src={avatarUrl || '/default-avatar.png'}
            alt="Avatar"
          />
        </div>

      </div>
        
        {
        type == "chat" &&
        /* Name, latest message, and time on the right */
          <div className="flex-1">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{name}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {is_online ? 'Online' : 'Offline'}
                </span>
             </div>
            <p className="text-gray-500 truncate">{latestMessage}</p>
         </div>
        }

        {
           type == "user" &&
              /* Name */
          <div className="flex-1">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{name}</h2>
             </div>
           </div>
        }
      

    </div>
  );
}

export default UsersCard;
