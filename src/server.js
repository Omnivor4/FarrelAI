import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Farrel Web Chat running at: http://localhost:${PORT}`);
  console.log(`🔒 Admin Dashboard available at:   http://localhost:${PORT}/farrelai`);
  console.log(`💬 Gemini Model:                  ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
  console.log(`====================================================`);
});
