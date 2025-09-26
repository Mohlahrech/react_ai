import Guest from '@/components/guest';
import { currentUser } from '@clerk/nextjs/server'
import React from 'react'

export default async function Homepage() {
  const user=await currentUser();
  if (!user) {
    return (
      <Guest/>
    )
  };
  return (
    <div className='bg-blue-500 text-white p-4 rounded'>Home Page</div>

  );
}
