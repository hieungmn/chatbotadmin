
import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 ========================================================`);
    console.log(`🚀 BOT MODULAR MONOLITH SERVER RUNNING ON PORT: http://localhost:${PORT}`);
    console.log(`🚀 CONNECTED TO SCHEMA V2: public.* IN chatbot_new_db`);
    console.log(`🚀 ========================================================`);
});