const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resetPasswordToken: DataTypes.STRING,
  resetPasswordExpires: DataTypes.DATE,
  pendingPasswordHash: DataTypes.STRING,
  newUsername: DataTypes.STRING,
  usernameChangeToken: DataTypes.STRING,
  usernameChangeExpires: DataTypes.DATE,
  deleteAccountToken: DataTypes.STRING,
  deleteAccountExpires: DataTypes.DATE
});

module.exports = User;
