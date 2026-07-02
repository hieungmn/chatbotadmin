import React from 'react';

interface ChatBubbleProps {
    isOpen: boolean;
    onClick: () => void;
    themeColor: string;
}

export default function ChatBubble({ isOpen, onClick, themeColor }: ChatBubbleProps) {
    return (
        <button 
            onClick={onClick}
            style={{
                position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
                width: '60px', height: '60px', borderRadius: '50%',
                backgroundColor: themeColor, color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
            }}
        >
            {isOpen ? '✖' : '💬'}
        </button>
    );
}