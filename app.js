const express = require('express');
const app = express();
require('dotenv').config();
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');

app.use(express.json());
app.use('/api/auth', authRoutes);

sequelize.sync().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
