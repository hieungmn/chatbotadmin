import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChatMessage, SuggestionChip } from '../../types/chat.types';

const CONTACT_URLS: Record<string, string> = {
    's-wing': 'https://s-wing.net/inquiry/',
    'c-wing': 'https://jukou-kanri.jp/contact/',
    'cansuke': 'https://cansuke.net/contact/',
    'account-business': 'https://account-business.jp/contact/'
};

const HOME_URLS: Record<string, string> = {
    's-wing': 'https://s-wing.net/',
    'c-wing': 'https://jukou-kanri.jp/',
    'cansuke': 'https://cansuke.net/',
    'account-business': 'https://anabuki-cs.jp/service/'
};

export default function WidgetSandbox() {
    const [siteId, setSiteId] = useState<string>('s-wing');
    const [siteName, setSiteName] = useState<string>('S-Wing Học Đường');
    const [themeColor, setThemeColor] = useState<string>('#46CFA6');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chips, setChips] = useState<SuggestionChip[]>([]);
    const [input, setInput] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [sessionId, setSessionId] = useState<string | null>(null); // Lưu trữ session_id để gửi feedback chuẩn xác

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [forceHideText, setForceHideText] = useState<boolean>(false);
    const [showFullBot, setShowFullBot] = useState<boolean>(true);

    const chatBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen && !forceHideText) {
                setIsHovered(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [isOpen, forceHideText]);

    useEffect(() => {
        let name = 'S-Wing Học Đường';
        let color = '#46CFA6';

        if (siteId === 'cansuke') {
            name = 'Cansuke Support'; color = '#E67E22';
        } else if (siteId === 'c-wing') {
            name = 'C-Wing Community'; color = '#1A5276';
        } else if (siteId === 'account-business') {
            name = 'Account Business'; color = '#27AE60';
        }

        setSiteName(name);
        setThemeColor(color);
        setSessionId(null); // Reset session khi đổi site

        setMessages([
            {
                id: 'welcome',
                sender: 'bot',
                text: `こんにちは! <b>${name}</b> です。何かご不明な点がございましたら、お気軽にご質問ください。`
            }
        ]);

        const http = (axios as any).default || axios;
        http.get(`http://localhost:3000/api/v1/chat/suggestions?site_id=${siteId}`)
            .then((res: any) => {
                if (res.data.success && res.data.chips) {
                    setChips(res.data.chips);
                } else {
                    setChips([]);
                }
            })
            .catch(() => setChips([]));

    }, [siteId]);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTo({
                top: chatBodyRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (forcedText?: string) => {
        const text = (forcedText || input).trim();
        if (!text || isTyping) return;

        const userMsgId = 'user-' + Date.now();
        setMessages(prev => [
            ...prev,
            { id: userMsgId, sender: 'user', text: text, faq_id: undefined, showFeedback: false }
        ]);
        if (!forcedText) setInput('');

        setIsTyping(true);

try {
            const http = (axios as any).default || axios;
            const response = await http.post('http://localhost:3000/api/v1/chat/query', {
                site_id: siteId,
                message: text,
                session_id: sessionId 
            });

            await new Promise(resolve => setTimeout(resolve, 600));

            // 🎯 KHAI BÁO BIẾN CHUẨN BỊ TRẢ LỜI NGOÀI KHỐI IF ĐỂ TRÁNH SỰ CỐ ĐƠ CHAT
            let botReply = '';
            let triggerFeedback = false;
            let currentFaqId = -1;

            // Trường hợp 1: Backend gọi thành công VÀ có câu trả lời từ DB/AI
            if (response.data && response.data.success && response.data.answer && response.data.answer.trim() !== "") {
                
                if (response.data.session_id) {
                    setSessionId(response.data.session_id);
                }
                
                botReply = response.data.answer;
                currentFaqId = response.data.faq_id !== undefined ? response.data.faq_id : -1;

                // Nếu có đường dẫn chi tiết từ FAQ Excel thì bọc thêm link
                if (response.data.redirect_url) {
                    botReply += `<br><a href="${response.data.redirect_url}" target="_blank" style="display: inline-block; margin-top: 8px; color: ${themeColor}; font-weight: 600; text-decoration: underline;">Chi tiết</a>`;
                }

                // Phát hiện nếu câu trả lời đó chính là link fallback do AI sinh ra hoặc backend đánh dấu là fallback
                if (response.data.is_fallback || botReply === CONTACT_URLS[siteId]) {
                    const fallbackUrl = CONTACT_URLS[siteId] || 'https://anabuki-cs.jp/service/';
                    botReply = `申し訳ありません。ご質問に対する回答が見つかりませんでした。<br>お手数ですが、以下のリンクよりお問い合わせください。<br><a href="${fallbackUrl}" target="_blank" style="display: inline-block; margin-top: 8px; color: ${themeColor}; font-weight: 600; text-decoration: underline;">✉ お問い合わせ窓口</a>`;
                }
                
                triggerFeedback = true;

            } else {
                // 🎯 TRƯỜNG HỢP 2: DATABASE TRỐNG HOẶC APIS KHÔNG TRẢ VỀ KẾT QUẢ (Xử lý Fallback ngay lập tức)
                const fallbackUrl = CONTACT_URLS[siteId] || 'https://anabuki-cs.jp/service/';
                botReply = `申し訳ありません。ご質問に対する回答が見つかりませんでした。<br>お手数ですが、以下のリンクよりお問い合わせください。<br><a href="${fallbackUrl}" target="_blank" style="display: inline-block; margin-top: 8px; color: ${themeColor}; font-weight: 600; text-decoration: underline;">✉ お問い合わせ窓口</a>`;
                triggerFeedback = true;
            }

            // 🎯 ĐẢM BẢO LUÔN ĐẨY TIN NHẮN LÊN MÀN HÌNH CHAT CHỨ KHÔNG BỊ "IM LẶNG"
            setMessages(prev => [
                ...prev,
                {
                    id: 'bot-' + Date.now(),
                    sender: 'bot',
                    text: botReply,
                    faq_id: currentFaqId,
                    showFeedback: triggerFeedback
                }
            ]);

        } catch (error) {
            console.error(error);
            // 🎯 TRƯỜNG HỢP 3: LỖI KẾT NỐI MẠNG HOẶC CRASH SERVER BACKEND
            const fallbackUrl = CONTACT_URLS[siteId] || 'https://anabuki-cs.jp/service/';
            setMessages(prev => [
                ...prev,
                {
                    id: 'bot-error-' + Date.now(),
                    sender: 'bot',
                    text: `申し訳ありません。ただいまシステムに接続しづらくなっております。<br>お手数ですが、以下のリンクよりお問い合わせください。<br><a href="${fallbackUrl}" target="_blank" style="display: inline-block; margin-top: 8px; color: ${themeColor}; font-weight: 600; text-decoration: underline;">✉ お問い合わせ窓口</a>`,
                    faq_id: -1,
                    showFeedback: false
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFeedback = async (msgId: string, faqId: number, score: number) => {
        // Ẩn ngay cặp nút bấm của tin nhắn vừa được phản hồi
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, showFeedback: false } : m));

        if (score === 1) {
            setMessages(prev => [
                ...prev,
                { id: 'fb-reply-' + Date.now(), sender: 'bot', text: "フィードバックありがとうございます！お役に立てて嬉しいです。😊" }
            ]);
        } else {
            const targetHomeUrl = HOME_URLS[siteId] || HOME_URLS['s-wing'];
            setMessages(prev => [
                ...prev,
                { id: 'fb-reply-' + Date.now(), sender: 'bot', text: `ご満足いただけず申し訳ございません。<br>お手数ですが、一度 <a href="${targetHomeUrl}" target="_blank" style="color: ${themeColor}; font-weight: bold; text-decoration: underline;">こちら（Trang chủ）</a> へ戻り、別の情報をお探しください。` }
            ]);
        }

        try {
            const http = (axios as any).default || axios;
            // Gửi đầy đủ tham số bao gồm site_id, session_id, và faq_id về API backend gốc
            await http.post('http://localhost:3000/api/v1/chat/feedback', { 
                site_id: siteId, 
                session_id: sessionId,
                faq_id: faqId, 
                score: score 
            });
        } catch (e) {
            console.error(e);
        }
    };

    const isExpanded = isHovered && !forceHideText;

    return (
        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }
                .dot { width: 8px; height: 8px; background-color: #94A3B8; borderRadius: 50%; display: inline-block; animation: bounce 1.4s infinite ease-in-out both; }
                .dot1 { animation-delay: -0.32s; }
                .dot2 { animation-delay: -0.16s; }
                .chat-body-scroll::-webkit-scrollbar { width: 5px; }
                .chat-body-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-body-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; borderRadius: 4px; }
            `}</style>

            {/* BỘ CHỌN KÊNH TEST */}
            <div style={{ backgroundColor: '#fff', padding: '16px 24px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginRight: '15px' }}>Select Test Channel:</label>
                <select
                    value={siteId}
                    onChange={(e) => {
                        setSiteId(e.target.value);
                        setShowFullBot(true);
                        setForceHideText(false);
                        setIsHovered(false);
                        setIsOpen(false);
                    }}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', color: '#334155', cursor: 'pointer' }}
                >
                    <option value="s-wing">S-Wing</option>
                    <option value="c-wing">C-Wing Community</option>
                    <option value="cansuke">Cansuke Support</option>
                    <option value="account-business">Account Business</option>
                </select>
            </div>

            {/* CONTAINER FIXED GÓC MÀN HÌNH CHỈ CHỨA CHATBOT */}
            {showFullBot && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999 }}>

                    {/* LAUNCHER ĐA NĂNG */}
                    {!isOpen && (
                        <div
                            onMouseEnter={() => { if (!forceHideText) setIsHovered(true); }}
                            onMouseLeave={() => { setIsHovered(false); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                height: '90px',
                                backgroundColor: 'transparent',
                                position: 'relative'
                            }}
                        >
                            <div
                                onClick={() => setIsOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '100px',
                                    padding: isExpanded ? '0 8px 0 ' + (isExpanded ? '28px' : '0px') : '0px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    height: '72px',
                                    width: isExpanded ? '350px' : '72px',
                                    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                                    overflow: 'hidden'
                                }}
                            >
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setForceHideText(true);
                                        setIsHovered(false);
                                    }}
                                    style={{
                                        color: '#A1ACB3',
                                        fontSize: '18px',
                                        fontWeight: 'normal',
                                        marginRight: '20px',
                                        display: isExpanded ? 'inline-block' : 'none',
                                        lineHeight: 1,
                                        userSelect: 'none'
                                    }}
                                    title="Thu nhỏ lại"
                                >
                                    ✕
                                </span>

                                <div style={{
                                    fontSize: '16px',
                                    color: '#3C4852',
                                    fontWeight: 500,
                                    flex: 1,
                                    opacity: isExpanded ? 1 : 0,
                                    visibility: isExpanded ? 'visible' : 'hidden',
                                    whiteSpace: 'nowrap',
                                    transition: 'opacity 0.2s ease-in-out',
                                    letterSpacing: '-0.2px'
                                }}>
                                    何かお困りですか？
                                </div>

                                <div style={{
                                    width: '58px',
                                    height: '58px',
                                    backgroundColor: themeColor,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    position: 'absolute',
                                    right: '7px',
                                    top: '7px',
                                    zIndex: 1,
                                    boxShadow: isExpanded ? 'none' : '0 3px 10px rgba(0,0,0,0.05)'
                                }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#FFFFFF' }}>
                                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                                    </svg>
                                </div>
                            </div>

                            {!isExpanded && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFullBot(false);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '-4px',
                                        width: '28px',
                                        height: '28px',
                                        backgroundColor: '#FFFFFF',
                                        color: '#94A3B8',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
                                        border: '1px solid #E2E8F0',
                                        zIndex: 10,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕
                                </div>
                            )}
                        </div>
                    )}

                    {/* KHUNG HỘP THOẠI CHAT CHÍNH */}
                    {isOpen && (
                        <div style={{
                            width: '380px', height: '600px', backgroundColor: '#FFFFFF', borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)', border: '1px solid #E2E8F0',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'absolute', bottom: '0', right: '0'
                        }}>
                            <div style={{ background: themeColor, color: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ position: 'relative', width: '10px', height: '10px', background: '#10B981', borderRadius: '50%', border: '2px solid white' }} />
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.3px' }}>{siteName}</div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>AI Assistant Online</div>
                                    </div>
                                </div>
                                <span onClick={() => setIsOpen(false)} style={{ cursor: 'pointer', fontSize: '18px', opacity: 0.85, padding: '4px', display: 'flex' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </span>
                            </div>

                            {/* CHAT BODY */}
                            <div ref={chatBodyRef} className="chat-body-scroll" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {messages.map((msg) => (
                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                        <div dangerouslySetInnerHTML={{ __html: msg.text }} style={{ padding: '10px 14px', lineHeight: 1.5, maxWidth: '82%', wordBreak: 'break-word', fontSize: '14px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.sender === 'user' ? themeColor : '#FFFFFF', color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B', borderRadius: msg.sender === 'user' ? '8px 8px 0px 8px' : '8px 8px 8px 0px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0' }} />

                                        {/* HIỂN THỊ NÚT ĐÁNH GIÁ (LIKE/DISLIKE) ĐỒNG BỘ */}
                                        {msg.sender === 'bot' && msg.showFeedback && msg.faq_id !== undefined && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignSelf: 'flex-start' }}>
                                                <button
                                                    onClick={() => handleFeedback(msg.id, msg.faq_id!, 1)}
                                                    style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid #CBD5E1', background: '#fff', color: '#334155', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    👍 <span>役に立ちました</span>
                                                </button>

                                                <button
                                                    onClick={() => handleFeedback(msg.id, msg.faq_id!, 0)}
                                                    style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid #CBD5E1', background: '#fff', color: '#334155', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    👎 <span>役に立たなかった</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isTyping && (
                                    <div style={{ alignSelf: 'flex-start', background: '#FFFFFF', padding: '12px 16px', borderRadius: '8px 8px 8px 0px', border: '1px solid #E2E8F0', display: 'flex', gap: '4px', alignItems: 'center', width: '46px' }}>
                                        <div className="dot dot1"></div>
                                        <div className="dot dot2"></div>
                                        <div className="dot" style={{ animationDelay: '0s' }}></div>
                                    </div>
                                )}

                                {chips.length > 0 && !isTyping && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-start', marginTop: '4px' }}>
                                        {chips.map((chip, index) => (
                                            <button key={index} onClick={() => handleSendMessage(chip.chip_label)} style={{ background: '#FFFFFF', color: themeColor, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500, border: `1px solid ${themeColor}`, whiteSpace: 'nowrap', transition: 'all 0.15s' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = themeColor; e.currentTarget.style.color = '#FFFFFF'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.color = themeColor; }}>{chip.chip_label}</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CHAT INPUT */}
                            <div style={{ borderTop: '1px solid #E2E8F0', padding: '14px 16px', display: 'flex', alignItems: 'center', background: '#FFFFFF', gap: '8px' }}>
                                <input type="text" value={input} disabled={isTyping} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder={isTyping ? "AI đang trả lời..." : "ご質問を入力してください..."} style={{ flex: 1, border: 'none', padding: '6px 0', outline: 'none', fontSize: '14px', color: '#1E293B', background: 'transparent' }} />
                                <button onClick={() => handleSendMessage()} disabled={isTyping || !input.trim()} style={{ background: input.trim() && !isTyping ? themeColor : '#94A3B8', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: input.trim() && !isTyping ? 'pointer' : 'default', fontWeight: 600, fontSize: '13px' }}>Gửi</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}