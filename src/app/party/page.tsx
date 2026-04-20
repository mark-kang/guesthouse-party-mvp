"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageSquare, Music, User, Bell, AlertTriangle } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function PartyDashboard() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [participantCount, setParticipantCount] = useState(0); 
  const [timeLeft, setTimeLeft] = useState('02:14:30'); 
  
  const [myStats, setMyStats] = useState({ likes: 0, messages: 0, cupids: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<'like' | 'message' | 'song' | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [songTitle, setSongTitle] = useState('');

  useEffect(() => {
    const savedNickname = localStorage.getItem('party_nickname');
    const savedUserId = localStorage.getItem('party_user_id');
    
    if (!savedNickname) {
      router.push('/');
      return;
    }
    
    setNickname(savedNickname);
    setUserId(savedUserId || '');

    // 초기 데이터 로드
    const loadInitialData = async () => {
      // 1. 사용자 리스트
      const { data: uData } = await supabase.from('users').select('*');
      if (uData) {
        setUsers(uData);
        setParticipantCount(uData.length);
      }
      
      // 2. 내 통계 로드
      if (savedUserId) {
        const { data: interactions } = await supabase.from('interactions').select('*').eq('receiver_id', savedUserId);
        if (interactions) {
          const likesCount = interactions.filter(i => i.type === 'like').length;
          const msgCount = interactions.filter(i => i.type === 'message').length;
          setMyStats(prev => ({ ...prev, likes: likesCount, messages: msgCount }));
        }
      }

      // 3. 임시 리더보드 (원래는 집계 쿼리를 써야하지만 데모용이므로 users 중 일부 렌더링)
      if (uData) {
        setLeaderboard(uData.slice(0, 3).map(u => ({ id: u.id, name: u.nickname, count: Math.floor(Math.random() * 10) + 1 })).sort((a,b)=>b.count - a.count));
      }
    };
    loadInitialData();

    // Realtime 구독
    const channel = supabase.channel('party_dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, (payload) => {
        const { receiver_id, type } = payload.new;
        if (receiver_id === savedUserId) {
          if (type === 'like') {
            setMyStats(prev => ({ ...prev, likes: prev.likes + 1 }));
            showToast('누군가 당신에게 호감을 보냈습니다! 💖');
          } else if (type === 'message') {
            setMyStats(prev => ({ ...prev, messages: prev.messages + 1 }));
            showToast('새로운 쪽지가 도착했습니다! 💌');
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => [...prev, payload.new]);
        setParticipantCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, (payload) => {
        setGlobalNotice(payload.new.content);
        // 5초 후 공지 알림 닫기
        setTimeout(() => setGlobalNotice(null), 8000);
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

  const handleInteractionSubmit = async () => {
    if (activeModal === 'like') {
      if(!targetUserId) return showToast('대상을 선택해주세요.');
      await supabase.from('interactions').insert([{ sender_id: userId, receiver_id: targetUserId, type: 'like' }]);
      showToast(`성공적으로 💘호감을 보냈습니다!`);
    } else if (activeModal === 'message') {
      if(!targetUserId || !messageContent) return showToast('대상과 메시지를 모두 입력해주세요.');
      await supabase.from('interactions').insert([{ sender_id: userId, receiver_id: targetUserId, type: 'message', content: messageContent }]);
      showToast(`성공적으로 💌쪽지를 보냈습니다!`);
    } else if (activeModal === 'song') {
      if(!songTitle) return showToast('노래 제목을 적어주세요.');
      await supabase.from('requests').insert([{ user_id: userId, type: 'song', content: songTitle }]);
      showToast(`DJ에게 '${songTitle}' 🎧신청이 접수되었습니다!`);
    }
    
    // 모달 상태 초기화
    setActiveModal(null);
    setTargetUserId('');
    setMessageContent('');
    setSongTitle('');
  };

  return (
    <div className="min-h-screen flex flex-col pb-24 relative overflow-hidden">
      
      {/* Global Notice Overlay */}
      <AnimatePresence>
        {globalNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 w-full z-50 p-4"
          >
            <div className="bg-red-500/90 backdrop-blur-xl text-white p-5 rounded-2xl shadow-2xl border-2 border-red-400">
              <h2 className="text-lg font-bold flex items-center mb-2"><AlertTriangle className="mr-2 animate-pulse"/> 관리자 긴급 공지</h2>
              <p className="font-medium text-red-50">{globalNotice}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          
          <h2 className="text-lg font-bold mb-4 flex items-center z-10 relative">
            🔥 실시간 인기 유저
          </h2>
          <div className="space-y-3 relative z-10">
            {leaderboard.map((u, idx) => (
              <motion.div 
                key={u.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-slate-800/80 rounded-xl border border-slate-700 backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-amber-700/20 text-amber-500'}`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium">{u.name}</span>
                </div>
                <div className="flex items-center text-pink-500 font-bold">
                  <Heart size={14} className="mr-1 fill-pink-500" /> {u.count}
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
            onClick={() => { setActiveModal('like'); setTargetUserId(''); }}
            className="flex-1 flex flex-col items-center py-2 text-pink-500 hover:bg-slate-700/50 rounded-full transition"
          >
            <Heart size={24} />
            <span className="text-[10px] mt-1 font-medium">호감 보내기</span>
          </button>
          
          <button 
            onClick={() => { setActiveModal('message'); setTargetUserId(''); setMessageContent(''); }}
            className="flex-1 flex flex-col items-center py-2 text-cyan-400 hover:bg-slate-700/50 rounded-full transition"
          >
            <MessageSquare size={24} />
            <span className="text-[10px] mt-1 font-medium">쪽지 발송</span>
          </button>
          
          <button 
            onClick={() => { setActiveModal('song'); setSongTitle(''); }}
            className="flex-1 flex flex-col items-center py-2 text-purple-400 hover:bg-slate-700/50 rounded-full transition"
          >
            <Music size={24} />
            <span className="text-[10px] mt-1 font-medium">노래 신청</span>
          </button>
        </div>
      </div>

      {/* Modals for Interactions */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setActiveModal(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>

              {activeModal === 'like' && (
                <>
                  <h3 className="text-xl font-bold flex items-center mb-4"><Heart className="mr-2 text-pink-500"/> 호감 보내기</h3>
                  <p className="text-sm text-slate-400 mb-4">마음에 드는 분에게 호감을 표현하세요! (익명 보장)</p>
                  <select 
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-6 focus:ring-2 focus:ring-pink-500 outline-none"
                  >
                    <option value="">대상을 선택하세요</option>
                    {users.filter(u => u.id !== userId).map(u => <option key={u.id} value={u.id}>{u.nickname}</option>)}
                  </select>
                  <button 
                    onClick={handleInteractionSubmit}
                    className="w-full bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-bold py-3 rounded-xl transition shadow-lg"
                  >
                    호감 보내기
                  </button>
                </>
              )}

              {activeModal === 'message' && (
                <>
                  <h3 className="text-xl font-bold flex items-center mb-4"><MessageSquare className="mr-2 text-cyan-400"/> 쪽지 발송</h3>
                  <select 
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-4 focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="">받을 사람을 선택하세요</option>
                    {users.filter(u => u.id !== userId).map(u => <option key={u.id} value={u.id}>{u.nickname}</option>)}
                  </select>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="상대에게 전할 짧은 메시지..."
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-6 h-28 resize-none focus:ring-2 focus:ring-cyan-500 outline-none"
                  ></textarea>
                  <button 
                    onClick={handleInteractionSubmit}
                    className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition shadow-lg"
                  >
                    쪽지 발송
                  </button>
                </>
              )}

              {activeModal === 'song' && (
                <>
                  <h3 className="text-xl font-bold flex items-center mb-4"><Music className="mr-2 text-purple-400"/> 노래 신청하기</h3>
                  <p className="text-sm text-slate-400 mb-4">듣고 싶은 노래가 있나요? DJ 관리자에게 신청해 보세요🎶</p>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="예: 뉴진스 - Hype Boy"
                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl mb-6 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <button 
                    onClick={handleInteractionSubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-3 rounded-xl transition shadow-lg"
                  >
                    DJ에게 신청하기
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
