"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, Music, User, Bell } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function PartyDashboard() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [participantCount, setParticipantCount] = useState(24); // Mock data for MVP
  const [timeLeft, setTimeLeft] = useState('02:14:30'); 
  
  const [myStats, setMyStats] = useState({ likes: 3, messages: 1, cupids: 0 });
  const [leaderboard, setLeaderboard] = useState([
    { name: '제주바람', count: 12 },
    { name: '서퍼보이', count: 8 },
    { name: '감귤아재', count: 5 },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedNickname = localStorage.getItem('party_nickname');
    const savedUserId = localStorage.getItem('party_user_id');
    
    if (!savedNickname) {
      router.push('/');
      return;
    }
    
    setNickname(savedNickname);
    setUserId(savedUserId || '');

    // Setup Supabase Realtime subscription for interactions
    const channel = supabase
      .channel('public:interactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, (payload) => {
        const { receiver_id, type } = payload.new;
        
        // If it's for me!
        if (receiver_id === savedUserId) {
          if (type === 'like') {
            setMyStats(prev => ({ ...prev, likes: prev.likes + 1 }));
            showToast('누군가 당신에게 호감을 보냈습니다! 💖');
          } else if (type === 'message') {
            setMyStats(prev => ({ ...prev, messages: prev.messages + 1 }));
            showToast('새로운 쪽지가 도착했습니다! 💌');
          }
        } else {
           // For others, just randomly simulate leaderboard change for MVP demo feel
           if(type === 'like' && Math.random() > 0.5) {
              setLeaderboard(prev => {
                const newLb = [...prev];
                newLb[0].count += 1;
                return newLb;
              });
           }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendLike = async () => {
    // Fake send like to random top user
    const target = leaderboard[0];
    showToast(`'${target.name}'님에게 호감을 보냈습니다!`);
    
    // In real app, we insert to DB. Here we just simulate for demo if DB isn't strictly enforced
    try {
      await supabase.from('interactions').insert([
        { sender_id: userId, receiver_id: 'fake-id', type: 'like' }
      ]);
    } catch(e) {}
  };

  return (
    <div className="min-h-screen flex flex-col pb-24 relative">
      {/* Header Info */}
      <header className="p-6 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-cyan-500">Party Live</h1>
          <p className="text-xs text-slate-400">남은 시간 {timeLeft}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="flex items-center text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            {participantCount}명 접속중
          </span>
          <p className="text-xs text-slate-400 mt-1">안녕, <b className="text-white">{nickname}</b>님!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* My Status Dashboard */}
        <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center">
            <User size={16} className="mr-2" /> 내 현황판
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
              <Heart className="text-pink-500 mb-2" size={24} />
              <span className="text-2xl font-bold">{myStats.likes}</span>
              <span className="text-xs text-slate-400 mt-1">받은 호감</span>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
              <MessageSquare className="text-cyan-400 mb-2" size={24} />
              <span className="text-2xl font-bold">{myStats.messages}</span>
              <span className="text-xs text-slate-400 mt-1">새 쪽지</span>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 bg-pink-600 text-[10px] font-bold rounded-bl-lg">2회 남음</div>
              <span className="text-lg mb-2">🏹</span>
              <span className="text-xl font-bold">{myStats.cupids}</span>
              <span className="text-xs text-slate-400 mt-1">보낸 큐피트</span>
            </div>
          </div>
        </section>

        {/* Real-time Leaderboard */}
        <section className="bg-slate-900/80 border border-pink-500/30 rounded-2xl p-5 shadow-[0_0_15px_rgba(255,46,147,0.1)] relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-pink-500/10 blur-[50px] rounded-full" />
          
          <h2 className="text-lg font-bold mb-4 flex items-center">
            🔥 실시간 호감도 랭킹
          </h2>
          <div className="space-y-3 relative z-10">
            {leaderboard.map((user, idx) => (
              <motion.div 
                key={user.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-amber-700/20 text-amber-500'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex items-center text-pink-500 font-bold">
                  <Heart size={14} className="mr-1 fill-pink-500" /> {user.count}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </main>

      {/* Floating Action / Bottom Nav */}
      <div className="fixed bottom-6 left-0 w-full px-6 z-30">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-full p-2 flex justify-between shadow-2xl">
          <button 
            onClick={handleSendLike}
            className="flex-1 flex flex-col items-center py-2 text-pink-500 hover:bg-slate-700/50 rounded-full transition"
          >
            <Heart size={24} />
            <span className="text-[10px] mt-1 font-medium">호감 보내기</span>
          </button>
          
          <button 
            onClick={() => showToast('쪽지 기능은 준비중입니다.')}
            className="flex-1 flex flex-col items-center py-2 text-cyan-400 hover:bg-slate-700/50 rounded-full transition"
          >
            <MessageSquare size={24} />
            <span className="text-[10px] mt-1 font-medium">쪽지 발송</span>
          </button>
          
          <button 
            onClick={() => showToast('신청곡이 DJ에게 전달되었습니다.')}
            className="flex-1 flex flex-col items-center py-2 text-purple-400 hover:bg-slate-700/50 rounded-full transition"
          >
            <Music size={24} />
            <span className="text-[10px] mt-1 font-medium">노래 신청</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 20, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl border border-pink-500/50 z-50 flex items-center min-w-[280px] justify-center"
        >
          <Bell size={18} className="mr-2 text-pink-400 animate-bounce" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </motion.div>
      )}
    </div>
  );
}
