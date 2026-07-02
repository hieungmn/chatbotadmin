import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:3000/api/v1', 
    headers: {
        'Content-Type': 'application/json',
    },
});

API.interceptors.request.use((config) => {
    // Tự động nhận diện cả 2 loại Token, không lo bị rỗng khi đổi tài khoản
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token'); 
    
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * 🎯 Gửi file tri thức AI lên Backend xử lý RAG
 * @param formData Đối tượng chứa file thô, site_id và file_type
 */
export const uploadKnowledgeFile = async (formData: FormData) => {
    const response = await API.post('/knowledge/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export default API;