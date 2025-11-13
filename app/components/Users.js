'use client'
import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabase';
import UsersCard from './UsersCard';
import { useRouter } from "next/navigation";
import { toast } from 'react-hot-toast';
import { AvatarGenerator } from 'random-avatar-generator';

function Users({ userData, setUser, setSelectedChatroom }) {
  const [activeTab, setActiveTab] = useState('chatrooms');
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [users, setUsers] = useState([]);
  const [userChatrooms, setUserChatrooms] = useState([]);

  const router = useRouter();
  

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  //get all users
  useEffect(() => {
    const setupUsers = async () => {
      setLoading2(true);
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*');
        if (error) {
          console.error('Error fetching users:', error);
        } else {
          setUsers(data);
        }
        setLoading2(false);
      };
      await fetchUsers();

      // Set current user as online
      if (userData?.id) {
        console.log('🟢 Setting user online:', userData.id);
        const { error } = await supabase
          .from('users')
          .update({ is_online: true })
          .eq('id', userData.id);

        if (error) {
          console.error('Error setting user online:', error);
        } else {
          console.log('✅ User set to online');
        }
      }
    };

    setupUsers();

    // Subscribe to real-time user updates (for avatar changes and online status)
    const channel = supabase
      .channel('users-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, (payload) => {
        console.log('Real-time user UPDATE:', payload.new);
        console.log('Current userData.id:', userData?.id);
        console.log('Payload user id:', payload.new.id);
        // Update users list
        setUsers(prev => prev.map(user =>
          user.id === payload.new.id ? payload.new : user
        ));
        // Update current user data if it's the current user
        if (payload.new.id === userData?.id) {
          console.log('Updating current user data with new avatar:', payload.new.avatar_url);
          setUser(payload.new);
        }
      })
      .subscribe((status, err) => {
        console.log('Users subscription status:', status, err);
      });

    // Cleanup function to set user offline when component unmounts
    return () => {
      console.log('🔴 Setting user offline on unmount:', userData?.id);
      if (userData?.id) {
        supabase
          .from('users')
          .update({ is_online: false })
          .eq('id', userData.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error setting user offline on unmount:', error);
            } else {
              console.log('✅ User set to offline on unmount');
            }
          });
      }
      supabase.removeChannel(channel);
    };

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.id]);

  // Manual refresh function for user avatars and online status (since real-time isn't working)
  const refreshUserAvatars = async () => {
    try {
      const { data: updatedUsers, error } = await supabase
        .from('users')
        .select('id, avatar_url, is_online');

      if (error) {
        console.error('Error refreshing user avatars:', error);
        return;
      }

      // Update the users list with fresh avatar data and online status
      setUsers(prevUsers =>
        prevUsers.map(user => {
          const updatedUser = updatedUsers.find(u => u.id === user.id);
          return updatedUser ? { ...user, avatar_url: updatedUser.avatar_url, is_online: updatedUser.is_online } : user;
        })
      );

      console.log('🔄 Refreshed all user avatars and online status');
    } catch (error) {
      console.error('Error in refreshUserAvatars:', error);
    }
  };

  // Auto-refresh user avatars every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshUserAvatars, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  //get chatrooms
  useEffect(() => {
    setLoading(true);
    if(!userData?.id) return;
    const fetchChatrooms = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*')
        .contains('users', [userData.id]);
      if (error) {
        console.error('Error fetching chatrooms:', error);
      } else {
        setUserChatrooms(data);
      }
      setLoading(false);
    };
    fetchChatrooms();

    // Subscribe to real-time changes for chatrooms
    const channel = supabase
      .channel(`chatrooms-${userData.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chatrooms',
        filter: `users@>["${userData.id}"]`, // Filter for chatrooms containing this user
      }, (payload) => {
        console.log('Real-time chatroom INSERT:', payload.new);
        // Check if chatroom already exists to avoid duplicates
        setUserChatrooms(prev => prev.some(cr => cr.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .subscribe((status, err) => {
        console.log('Chatroom subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chatroom updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Chatroom subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData]);


// Create a chatroom
const createChat = async (user) => {
  // Check if a chatroom already exists for these users
  const { data: existingChatrooms, error: checkError } = await supabase
    .from('chatrooms')
    .select('*')
    .or(`and(users.cs.{${userData.id}},users.cs.{${user.id}})`);

  if (checkError) {
    console.error('Error checking existing chatrooms:', checkError);
    return;
  }

  if (existingChatrooms && existingChatrooms.length > 0) {
    // Chatroom already exists, handle it accordingly (e.g., show a message)
    console.log('Chatroom already exists for these users.');
    toast.error('Chatroom already exists for these users.');
    return;
  }

  // Chatroom doesn't exist, proceed to create a new one
  const usersData = {
    [userData.id]: userData,
    [user.id]: user,
  };

  const { data, error } = await supabase
    .from('chatrooms')
    .insert([
      {
        users: [userData.id, user.id],
        users_data: JSON.stringify(usersData), // Store as JSON string
        last_message: '',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating chatroom:', error);
    toast.error('Failed to create chatroom');
  } else {
    console.log('Chatroom created:', data);
    // Real-time subscription will handle adding to state, but add immediately for instant UI update
    setUserChatrooms(prev => [...prev, data]);
    setActiveTab("chatrooms");
  }
};

//open chatroom
const openChat = async (chatroom) => {
    try {
      // Parse users_data if it's stored as JSON string
      let usersData = chatroom.users_data;
      if (typeof usersData === 'string') {
        usersData = JSON.parse(usersData);
      }

      const otherUserId = chatroom.users.find((id) => id !== userData.id);
      const data = {
        id: chatroom.id,
        myData: userData,
        otherData: usersData[otherUserId],
      }
      setSelectedChatroom(data);
    } catch (error) {
      console.error('Error opening chat:', error);
    }
}

const logoutClick = async () => {
  console.log('🚪 Logging out user:', userData.id);
  // Set user as offline before logging out
  if (userData?.id) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_online: false })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error setting user offline:', updateError);
    } else {
      console.log('✅ User set to offline');
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error);
  } else {
    router.push('/login');
    toast.success('Logged out successfully');
  }
}

const handleAvatarClick = () => {
  const generator = new AvatarGenerator();
  const newAvatarUrl = generator.generateRandomAvatar();

  updateAvatar(newAvatarUrl);
}

const updateAvatar = async (newAvatarUrl) => {
  console.log('Updating avatar for user:', userData.id, 'to:', newAvatarUrl);
  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', userData.id);

    if (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    } else {
      console.log('Avatar updated in database successfully');
      // Update local state
      setUser(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      toast.success('Avatar updated successfully!');
    }
  } catch (error) {
    console.error('Error updating avatar:', error);
    toast.error('Failed to update avatar');
  }
}



  return (
    <div className='h-screen overflow-auto mt-4 mb-20 bg-gradient-to-b from-white to-gray-50'>
      {/* Header with Connectly name and user profile */}
      <div className="flex flex-col items-center p-4 bg-white/90 backdrop-blur-sm rounded-lg mx-2 mt-2 shadow-lg">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Connectly
        </h1>
        <div className="flex flex-col items-center space-y-2">
          <img
            key={userData?.avatar_url} // Force re-render when avatar changes
            src={userData?.avatar_url || '/default-avatar.png'}
            alt="Profile"
            className="w-16 h-16 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleAvatarClick}
          />
          <p className="text-sm text-gray-600 font-medium">{userData?.name}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between p-4 space-y-4 lg:space-y-0 bg-white/90 backdrop-blur-sm rounded-lg mx-2 mt-4 shadow-lg">
        <button
          className={`btn btn-outline transition-all duration-300 hover:scale-105 ${
            activeTab === 'users'
              ? 'btn-primary bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
              : 'hover:bg-blue-50 hover:border-blue-300'
          }`}
          onClick={() => handleTabClick('users')}
        >
          👥 Users
        </button>
        <button
          className={`btn btn-outline transition-all duration-300 hover:scale-105 ${
            activeTab === 'chatrooms'
              ? 'btn-primary bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
              : 'hover:bg-green-50 hover:border-green-300'
          }`}
          onClick={() => handleTabClick('chatrooms')}
        >
          💬 Chatrooms
        </button>
      </div>

      <div>
        {activeTab === 'chatrooms' && (
          <>
            <h1 className='px-4 text-base font-semibold'>Chatrooms</h1>
            {
              loading && (
                <div className="flex justify-center items-center h-full">
                  <span className="loading loading-spinner text-primary"></span>
                </div>
              )
            }
            {
              userChatrooms.map((chatroom) => {
                try {
                  // Parse users_data if it's stored as JSON string
                  let usersData = chatroom.users_data;
                  if (typeof usersData === 'string') {
                    usersData = JSON.parse(usersData);
                  }

                  const otherUserId = chatroom.users.find((id) => id !== userData?.id);
                  const otherUser = usersData[otherUserId];

                  return (
                    <div key={chatroom.id + (otherUser?.avatar_url || '')} onClick={()=>{openChat(chatroom)}}>
                      <UsersCard
                        name={otherUser?.name || 'Unknown User'}
                        avatarUrl={otherUser?.avatar_url || ''}
                        latestMessage={chatroom.last_message}
                        type={"chat"}
                        is_online={otherUser?.is_online || false}
                      />
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering chatroom:', error);
                  return null;
                }
              })
            }
           </>
          )}

        {activeTab === 'users' && (
          <>
            <h1 className='mt-4 px-4 text-base font-semibold'>Users</h1>
            {
              loading2 && (
                <div className="flex justify-center items-center h-full">
                  <span className="loading loading-spinner text-primary"></span>
                </div>
              )
            }
            {
              users.map((user) => (
                <div key={user.id} onClick={()=>{createChat(user)}}>
                 {user.id !== userData?.id &&
                <UsersCard
                  name={user.name}
                  avatarUrl={user.avatar_url}
                  latestMessage={""}
                  type={"user"}
                />
                 }
                </div> 
              ))
            }
          </>
        )}
      </div>

      {/* Logout Button at Bottom Left */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={logoutClick}
          className="btn btn-outline btn-error transition-all duration-300 hover:scale-105 shadow-lg"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

export default Users;
