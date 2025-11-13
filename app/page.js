'use client'
import React,{useEffect,useState} from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Users from './components/Users';
import ChatRoom from './components/ChatRoom';

function page() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [selectedChatroom, setSelectedChatroom] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔄 Session result:', { session: !!session, error });

        if (error) {
          console.error('Session error:', error);
          if (isMounted) {
            setUser(null);
            router.push('/login');
          }
          return;
        }

        if (session?.user) {
          console.log('🔄 User authenticated, fetching user data...');
          // Wait a bit for registration to complete
          await new Promise(resolve => setTimeout(resolve, 500));

          // Fetch user data from database
          const { data, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('🔄 User data fetch result:', { data, error: userError });

          if (userError) {
            console.error('Error fetching user:', userError);
            // If user doesn't exist in database, redirect to login
            if (isMounted) {
              setUser(null);
              router.push('/login');
            }
          } else {
            console.log('🔄 Setting user data:', data);
            if (isMounted) {
              setUser(data);
            }
          }
        } else {
          console.log('🔄 No session, redirecting to login');
          if (isMounted) {
            setUser(null);
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Unexpected error in getInitialSession:', error);
        if (isMounted) {
          setUser(null);
          router.push('/login');
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        try {
          if (session?.user) {
            // Wait a bit for registration to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch user data from database
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (error) {
              console.error('Error fetching user:', error);
              setUser(null);
              router.push('/login');
            } else {
              setUser(data);
            }
          } else {
            setUser(null);
            router.push('/login');
          }
        } catch (error) {
          console.error('Error in auth change handler:', error);
          setUser(null);
          router.push('/login');
        }
      }
    );

    // Fetch all users for contact sharing
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if(user === null) return (
    <div className='flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50'>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className='text-2xl text-gray-600 font-semibold'>Loading Connectly...</div>
        <div className='text-lg text-gray-500 mt-2'>Please wait while we set up your chat experience</div>
      </div>
    </div>
  );

 
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Left side users */}
      <div className="flex-shrink-0 w-3/12 bg-white/80 backdrop-blur-sm shadow-xl border-r border-gray-200">
        <Users userData={user} setUser={setUser} setSelectedChatroom={setSelectedChatroom}/>
      </div>

      {/* Right side chat room */}
      <div className="flex-grow w-9/12 bg-white/60 backdrop-blur-sm">
        {
          selectedChatroom ? (<>
      <ChatRoom user={user} selectedChatroom={selectedChatroom} users={users} />
          </>):(<>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-2xl text-gray-600 font-semibold">Welcome to Connectly</div>
              <div className="text-lg text-gray-500 mt-2">Select a chatroom to start messaging</div>
            </div>
          </div>
          </>)
        }

      </div>
    </div>
  )
}

export default page