const { sequelize, User } = require('../models');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const users = await User.findAll();
    console.log('Users in database:');
    users.forEach(u => {
      console.log(`- Username: ${u.Username}, Role: ${u.Role}, FullName: ${u.FullName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

check();
