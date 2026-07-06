(function() {
    // 1. Kiểm tra xem chatbot đã được nhúng trên trang này chưa (tránh bị trùng lặp bong bóng chat)
    if (document.getElementById('my-custom-chatbot-root')) {
        console.log("Chatbot đã tồn tại trên trang này rồi!");
        return;
    }

    // 2. Tạo một thẻ <div> để chứa Chatbot nằm cố định ở góc màn hình
    const shadowRootContainer = document.createElement('div');
    shadowRootContainer.id = 'my-custom-chatbot-root';
    shadowRootContainer.style.position = 'fixed';
    shadowRootContainer.style.bottom = '0';
    shadowRootContainer.style.right = '0';
    shadowRootContainer.style.zIndex = '999999'; // Đảm bảo nổi lên trên mọi thành phần của trang web thật
    document.body.appendChild(shadowRootContainer);

    // 3. Sử dụng Shadow DOM để CSS của trang web thật không làm vỡ giao diện của Chatbot
    const shadow = shadowRootContainer.attachShadow({ mode: 'open' });

    // 4. Tạo thẻ chứa khung giao diện bên trong Shadow DOM
    const widgetInner = document.createElement('div');
    widgetInner.id = 'chatbot-widget-inner';
    shadow.appendChild(widgetInner);

    // 5. Liên kết tới file CSS và JS sau khi bạn đã build từ phía Frontend
    // (Khi nào bạn deploy lên mạng thật thì thay localhost:3000 thành tên miền của bạn)
    const scriptSrc = "http://localhost:3000/dist/chatbot-widget.js"; 
    const styleSrc = "http://localhost:3000/dist/chatbot-widget.css";

    // Nhúng file CSS vào Shadow DOM
    const linkTag = document.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.href = styleSrc;
    shadow.appendChild(linkTag);

    // Nhúng file Script JS vào trang web để kích hoạt React hoạt động
    const scriptTag = document.createElement('script');
    scriptTag.src = scriptSrc;
    scriptTag.async = true;
    document.head.appendChild(scriptTag);

    console.log("🚀 Đang khởi chạy Chatbot AI đè lên trang web này...");
})();