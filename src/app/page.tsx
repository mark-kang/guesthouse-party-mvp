"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [savedNickname, setSavedNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sn = localStorage.getItem('party_nickname');
    if (sn) setSavedNickname(sn);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    
    try {
      const cachedNickname = localStorage.getItem('party_nickname');
      // 기존 본인 닉네임이라면 중복 체크+삽입 생략하고 바로 입장
      if (nickname.trim() === cachedNickname) {
        router.push('/party');
        return;
      }

      // 1. Check for duplicate nickname
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('nickname', nickname.trim());

      if (existingUsers && existingUsers.length > 0) {
        alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.');
        setLoading(false);
        return;
      }

      // 2. Insert user into Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([{ nickname: nickname.trim() }])
        .select()
        .single();
        
      if (error) {
        console.error('Error joining party:', error);
        // Fallback for MVP if DB is not setup: just use local storage
      }
      
      // Store user ID/nickname in local storage for the MVP session
      if (data) {
         localStorage.setItem('party_user_id', data.id);
      } else {
         localStorage.setItem('party_user_id', crypto.randomUUID());
      }
      localStorage.setItem('party_nickname', nickname.trim());
      
      router.push('/party');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm flex flex-col items-center space-y-8"
      >
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,46,147,0.4)]">
          <PartyPopper size={48} className="text-white" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">제주 파티의 밤</h1>
          <p className="text-slate-400 text-sm">QR 스캔 완료! 오늘 파티에서 사용할 멋진 닉네임을 설정해주세요.</p>
        </div>

        <form onSubmit={handleJoin} className="w-full space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              if (e.target.value.length <= 8) {
                setNickname(e.target.value);
              }
            }}
            placeholder="닉네임 (최대 8자)"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-pink-500 transition shadow-inner"
            required
          />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition flex items-center justify-center opacity-90 hover:opacity-100"
          >
            {loading ? '입장 중...' : '파티 입장하기'}
          </motion.button>
        </form>

        {savedNickname && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center w-full">
            <p className="text-slate-400 text-sm mb-3">기존 파티 참석 기록이 있습니다.</p>
            <button 
              onClick={() => router.push('/party')}
              className="w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition"
            >
              <span className="text-cyan-400 font-bold">{savedNickname}</span> (으)로 계속하기
            </button>
          </motion.div>
        )}
      </motion.div>
      
      {/* Background decoration elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[50%] h-[50%] bg-pink-500/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] bg-cyan-500/20 blur-[100px] rounded-full" />
      </div>
    </main>
  );
}
