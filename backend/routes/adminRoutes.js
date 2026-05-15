const express = require('express');
const router = express.Router();
const { User } = require('../models');

// GET all users (except basic info for security)
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['Password'] },
      order: [['CreatedAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// DELETE a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    // Prevent deleting the primary admin
    if (user.Username === 'admin') {
      return res.status(400).json({ msg: 'Primary admin cannot be deleted' });
    }

    await user.destroy();
    res.json({ msg: 'User deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
