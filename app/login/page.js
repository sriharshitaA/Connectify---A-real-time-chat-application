"use client"
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const newErrors = {};
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Invalid email address';
    }
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setLoading(true);
    try {
      if (validateForm()) {
        // Sign in user with Supabase Authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if user exists in database
        if (data.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (userError && userError.code === 'PGRST116') { // No rows returned
            // User not in DB, insert using metadata from registration
            const { name, avatar_url } = data.user.user_metadata || {};
            if (!name || !avatar_url) {
              toast.error('Account setup incomplete. Please register again.');
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: data.user.id,
                  name,
                  email: data.user.email,
                  avatar_url,
                },
              ]);
            if (insertError) {
              console.error('Database insert error:', insertError);
              toast.error('Failed to set up account. Please try again.');
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
          } else if (userError) {
            console.error('Database error:', userError);
            toast.error('Login failed. Please try again.');
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          toast.success('Login successful!');
          router.push('/');
        }
        setErrors({});
      }
    } catch (error) {
      // Handle login errors
      console.error('Error logging in user:', error.message);
      toast.error(error.message);
      setErrors({});
    }
    setLoading(false);
  };
 
  return (
    <div className="flex justify-center items-center h-screen font-primary p-10 m-2">

      {/*form*/}
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-2xl shadow-lg p-10">
    
        <h1 className='text-3xl text-center font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8'>Connectly</h1>

      
         {/*email*/}
        <div>
          <label className="label">
            <span className="text-base label-text">Email</span>
          </label>
          <input
            type="text"
            placeholder="Email"
            className="w-full input input-bordered"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
           {errors.email && <span className="text-red-500">{errors.email}</span>}
        </div>

         {/*password*/}
        <div>
          <label className="label">
            <span className="text-base label-text">Password</span>
          </label>
          <input
            type="password"
            placeholder="Enter Password"
            className="w-full input input-bordered"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="text-red-500">{errors.password}</span>}
        </div>

        

        <div>
          <button type='submit' className="btn btn-block bg-[#0b3a65ff] text-white">
            {
              loading? <span className="loading loading-spinner loading-sm"></span> : 'Sign In'
            }
          </button>
        </div>

         <span>
           Don't have an account?{' '}
           <Link href="/register" className="text-blue-600 hover:text-blue-800 hover:underline">
            Register
          </Link>
        </span>
      
      </form>

    </div>
  )
}

export default page