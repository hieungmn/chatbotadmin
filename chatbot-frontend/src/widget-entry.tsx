import React from 'react';
import ReactDOM from 'react-dom/client';
import WidgetSandbox from './pages/user/WidgetSandbox';

// Khai báo kiểu dữ liệu cho window để TypeScript không bắt bẻ
declare global {
  interface Window {
    initCentralChatbot?: (config: { site_id: string; api_url?: string }) => void;
  }
}

// Định nghĩa hàm khởi tạo toàn cục
window.initCentralChatbot = (config) => {
  // 1. Tìm và xóa root cũ nếu có (tránh trùng lặp khi dán lại console)
  const oldRoot = document.getElementById('chatbot-widget-root');
  if (oldRoot) oldRoot.remove();

  // 2. KHAI BÁO BIẾN ĐÂY: Tạo thẻ div mới tinh dưới cùng body
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'chatbot-widget-root';
  document.body.appendChild(widgetContainer);

  // 3. Khởi tạo React Root đập thẳng vào container vừa khai báo ở trên
  const root = ReactDOM.createRoot(widgetContainer);

  // 4. Ép kiểu tạm thời cho WidgetSandbox để render mượt mà
  const DynamicWidget = WidgetSandbox as any;

  root.render(
    <React.StrictMode>
      <DynamicWidget 
        siteId={config.site_id} 
        apiUrl={config.api_url || 'http://localhost:3000'} 
      />
    </React.StrictMode>
  );
};