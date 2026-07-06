// 1. Vá lỗi "process is not defined" ngay dòng đầu tiên
if (typeof (window as any).process === 'undefined') {
    (window as any).process = { env: {} };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import WidgetSandbox from './pages/user/WidgetSandbox';

// Định nghĩa kiểu dữ liệu window mở rộng cho TypeScript đỡ báo đỏ
declare global {
  interface Window {
    initCentralChatbot: (config: { site_id: string; site_name?: string }) => void;
  }
}

// 2. Định nghĩa hàm khởi tạo toàn cục đúng theo ảnh cấu trúc của bạn
window.initCentralChatbot = (config) => {
    console.log("🛠️ Đang khởi tạo giao diện cho site:", config.site_id);

    // Lưu site_id vào sessionStorage để Component WidgetSandbox của bạn lấy ra sử dụng để gọi API
    sessionStorage.setItem('current_site_id', config.site_id);
    if (config.site_name) {
        sessionStorage.setItem('current_site_name', config.site_name);
    }

    // 3. Tự động tìm hoặc tạo thẻ bọc ngoài cùng (Container) nếu trang web chưa có
    let rootContainer = document.getElementById('my-custom-chatbot-root');
    if (!rootContainer) {
        rootContainer = document.createElement('div');
        rootContainer.id = 'my-custom-chatbot-root';
        rootContainer.style.position = 'fixed';
        rootContainer.style.bottom = '20px';
        rootContainer.style.right = '20px';
        rootContainer.style.zIndex = '999999';
        document.body.appendChild(rootContainer);
    }

    // 4. Tạo Shadow DOM bảo vệ (tránh bị CSS của trang web thật làm đè/vỡ giao diện chatbot)
    const shadow = rootContainer.shadowRoot || rootContainer.attachShadow({ mode: 'open' });
    
    // 5. Tạo một div bên trong Shadow DOM làm đích để React render vào
    let targetNode = shadow.getElementById('chatbot-widget-inner');
    if (!targetNode) {
        targetNode = document.createElement('div');
        targetNode.id = 'chatbot-widget-inner';
        shadow.appendChild(targetNode);
    }

    // 6. Tiến hành render React Component WidgetSandbox vào đích
    const root = ReactDOM.createRoot(targetNode);
    root.render(<WidgetSandbox />);
};