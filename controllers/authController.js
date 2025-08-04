const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const sendMail = require('../utils/sendMail');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


// Signup
exports.signup = async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 3600000); // 1 hour

    const user = await User.create({
      name,
      username,
      email,
      password: hash,
      emailVerificationToken,
      emailVerificationExpires,
      isVerified: false
    });

    const link = `http://localhost:5000/api/auth/verify-email/${emailVerificationToken}`;
    await sendMail({
      to: email,
      subject: 'Verify your Email',
      text: `Please click this link to verify your email: ${link}`
    });

    res.json({ message: 'Signup successful. Check your email to verify your account.' });
  } catch (err) {
    res.status(400).json({ message: 'Signup failed', error: err.message });
  }
};


// Email Verification
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link' });

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};


// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(401).json({ message: 'Please verify your email first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};


// Change Password Request (needs auth middleware to set req.user)
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
  
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
  
      // Hash new password and store temporarily
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const token = uuidv4();
      const expires = new Date(Date.now() + 3600000); // 1 hour
  
      user.resetPasswordToken = token;
      user.resetPasswordExpires = expires;
      user.pendingPasswordHash = newPasswordHash; // Store hashed new password
      await user.save();8
  
      // Send verification email
      const link = `http://localhost:5000/api/auth/verify-password-change/${token}`;
      await sendMail({
        to: user.email,
        subject: 'Verify Your Password Change',
        text: `Click here to verify your password change: ${link}`
      });
  
      res.json({ message: 'Password change request sent. Check your email to confirm.' });
  
    } catch (err) {
      res.status(500).json({ message: 'Password change failed', error: err.message });
    }
  };
  
  // Verify Password Change via Email Link (GET)
  exports.verifyPasswordChangeFromEmailLink = async (req, res) => {
    const { token } = req.params;
  
    try {
      const user = await User.findOne({
        where: {
          resetPasswordToken: token, // Check correct token field
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });
  
      if (!user || !user.pendingPasswordHash) {
        return res.status(400).send('Invalid token or no pending password change.');
      }
  
      // Apply the pending password
      user.password = user.pendingPasswordHash;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.pendingPasswordHash = null;
      await user.save();
  
      res.send('Password updated successfully!');
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  };
  
  // Verify Password Change via API (POST - Optional)
  exports.verifyPasswordChange = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
  
    try {
      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });
  
      if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
  
      // Hash and update password
      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
  
      res.json({ message: 'Password updated successfully!' });
    } catch (err) {
      res.status(500).json({ message: 'Verification failed', error: err.message });
    }
  };
  

// Request Username Change
exports.requestUsernameChange = async (req, res) => {
  const { email, newUsername } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if the new username is the same as the current one
    if (user.username === newUsername) {
      return res.status(400).json({ message: 'New username is the same as the current username' });
    }

    // Check if the new username already exists
    const existingUser = await User.findOne({ where: { username: newUsername } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken, please choose a different one' });
    }

    // Generate a unique token and set expiry
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Update the user's new username and token data
    user.newUsername = newUsername;
    user.usernameChangeToken = token;
    user.usernameChangeExpires = expires;
    await user.save();

    // Send confirmation email with the verification link
    const link = `http://localhost:5000/api/auth/confirm-username/${token}`;
    await sendMail({
      to: email,
      subject: 'Confirm Username Change',
      text: `Click here to confirm your username change: ${link}`
    });

    res.json({ message: 'Username change verification link sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send username change email', error: err.message });
  }
};


// Confirm Username Change
exports.confirmUsernameChange = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      where: {
        usernameChangeToken: token,
        usernameChangeExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.username = user.newUsername;
    user.newUsername = null;
    user.usernameChangeToken = null;
    user.usernameChangeExpires = null;
    await user.save();

    res.json({ message: 'Username updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Username change failed', error: err.message });
  }
};


// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'username', 'email', 'createdAt']
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

exports.initiateDeleteAccount = async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      // Generate token and set expiration (1 hour)
      const deleteToken = uuidv4();
      user.deleteAccountToken = deleteToken;
      user.deleteAccountExpires = new Date(Date.now() + 3600000);
      await user.save();
  
      // Send verification email
      const link = `http://localhost:5000/api/auth/confirm-delete/${deleteToken}`;
      await sendMail({
        to: user.email,
        subject: 'Confirm Account Deletion',
        text: `Click this link to permanently delete your account: ${link}\n\nThis link expires in 1 hour.`
      });
  
      res.json({ message: 'Deletion verification email sent. Check your inbox.' });
    } catch (err) {
      res.status(500).json({ message: 'Deletion request failed', error: err.message });
    }
  };
  
  // Confirm Account Deletion
  exports.confirmDeleteAccount = async (req, res) => {
    try {
      const { token } = req.params;
  
      const user = await User.findOne({
        where: {
          deleteAccountToken: token,
          deleteAccountExpires: { [Op.gt]: Date.now() }
        }
      });
  
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
  
      // Delete user permanently
      await user.destroy();
      
      res.json({ message: 'Account permanently deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Deletion failed', error: err.message });
    }
  };
  