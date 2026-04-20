"use client"

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Music, Users, ShieldAlert } from 'lucide-react';
import { supabase } from '@/utils/supabase';

const ADMIN_PASSCODE = '7777'; // Simple demo passcode

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [noticeInput, setNoticeInput] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) setIsAuthenticated(true);
    else alert('올바르지 않은 비밀번호입니다.');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Fetch initial data
    const fetchData = async () => {
      const { data: userData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (userData) setUsers(userData);

      const { data: reqData } = await supabase.from('requests').select('*, users(nickname)').order('created_at', { ascending: false });
      if (reqData) setRequests(reqData);
    };
    fetchData();

    // Subscribe to new users and requests
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        setUsers(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests' }, async (payload) => {
        // Fetch user nickname for the new request
        const { data: uInfo } = await supabase.from('users').select('nickname').eq('id', payload.new.user_id).single();
        const augmentedReq = { ...payload.new, users: { nickname: uInfo?.nickname || 'Unknown' } };
        setRequests(prev => [augmentedReq, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const sendNotice = async () => {
    if (!noticeInput.trim()) return;
    try {
      await supabase.from('notices').insert([{ content: noticeInput }]);
      alert('공지가 전체에게 발송되었습니다!');
      setNoticeInput('');
    } catch(e) {
      alert('발송 실패');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm text-center">
          <ShieldAlert className="mx-auto mb-4 text-purple-500" size={48} />
          <h1 className="text-xl font-bold mb-6">관리자 로그인</h1>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Passcode 입력" 
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg mb-4 text-center focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold transition">접속</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto bg-slate-950">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Party Admin Center</h1>
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">Live DB Connected</span>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center"><Bell size={16} className="mr-2"/> 즉시 공지 발송 (전체 알림)</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="화면 전체에 띄울 공지사항 입력..." 
            value={noticeInput}
            onChange={e => setNoticeInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <button onClick={sendNotice} className="bg-blue-600 hover:bg-blue-500 px-6 rounded-lg font-bold transition">발송</button>
        </div>
      </section>

      <section className="mb-8 bg-slate-900 border border-slate-800 rounded-xl p-4 h-64 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-400 mb-4 flex items-center sticky top-0 bg-slate-900 pb-2"><Music size={16} className="mr-2 text-pink-400"/> 접수된 신청곡 리스트</h2>
        <ul className="space-y-3">
          {requests.filter(r => r.type === 'song').map((req, i) => (
            <motion.li initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div>
                <span className="text-xs text-slate-400 block mb-1">신청자: {req.users?.nickname}</span>
                <span className="font-medium text-pink-300">🎵 {req.content}</span>
              </div>
              <span className="text-[10px] text-slate-500">{new Date(req.created_at).toLocaleTimeString('ko-KR')}</span>
            </motion.li>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500 text-center py-4">아직 신청곡이 없습니다.</p>}
        </ul>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-64 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-400 mb-4 flex items-center sticky top-0 bg-slate-900 pb-2"><Users size={16} className="mr-2 text-cyan-400"/> 접속 유저 목록 ({users.length}명)</h2>
        <ul className="space-y-2">
          {users.map((u, i) => (
            <li key={i} className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
              <span className="font-medium">{u.nickname}</span>
              <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{new Date(u.created_at).toLocaleTimeString('ko-KR')} 입장</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
