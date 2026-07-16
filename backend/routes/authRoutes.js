const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Secret Key Loading Helper
const getJwtSecret = () => process.env.JWT_SECRET || 'jeeva_fallback_secret_key_2026';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'jeeva_fallback_refresh_secret_key_2026';

// Helper to sign JWTs
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    username: user.Username,
    role: user.Role,
    fullName: user.FullName
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id: user.id }, getRefreshSecret(), { expiresIn: '30d' });

  return { token, refreshToken };
};

// @route   POST api/auth/login
// @desc    Authenticate user & return JWT + Refresh Token
router.post('/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { Username: username } });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const { token, refreshToken } = generateTokens(user);

        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                username: user.Username,
                role: user.Role,
                fullName: user.FullName
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/refresh
// @desc    Verify refresh token and issue new access token
router.post('/refresh', authLimiter, async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ msg: 'Refresh token is required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, getRefreshSecret());
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ msg: 'Invalid token user context' });
        }

        const tokens = generateTokens(user);
        res.json({
            token: tokens.token,
            refreshToken: tokens.refreshToken
        });
    } catch (err) {
        return res.status(403).json({ msg: 'Invalid or expired refresh token' });
    }
});

// @route   GET api/auth/verify
// @desc    Verify current access token & return user
router.get('/verify', verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({
            id: user.id,
            username: user.Username,
            role: user.Role,
            fullName: user.FullName
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/register
// @desc    Register a new employee user (admin protected in production)
router.post('/register', async (req, res) => {
    const { Username, Password, FullName, Role } = req.body;
    try {
        let user = await User.findOne({ where: { Username } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);

        user = await User.create({
            Username,
            PasswordHash: hashedPassword,
            FullName,
            Role: Role || 'EMP'
        });

        res.json({ msg: 'User registered successfully', userId: user.id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
