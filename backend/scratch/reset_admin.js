const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const username = 'admin';
    const newPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const [updatedCount] = await User.update(
      { PasswordHash: hashedPassword },
      { where: { Username: username } }
    );
    
    if (updatedCount > 0) {
      console.log(`Password for user '${username}' has been reset to '${newPassword}'.`);
    } else {
      // If user doesn't exist, create it
      await User.create({
        Username: username,
        PasswordHash: hashedPassword,
        Role: 'ADMIN',
        FullName: 'Administrator'
      });
      console.log(`User '${username}' created with password '${newPassword}'.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

reset();
