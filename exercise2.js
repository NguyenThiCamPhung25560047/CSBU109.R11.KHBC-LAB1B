require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const initConnection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });

  await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
  await initConnection.end();

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    await pool.query('CREATE TABLE IF NOT EXISTS categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
    await pool.query('CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, category_id INT NOT NULL, item_name VARCHAR(150) NOT NULL, price DECIMAL(12,2) NOT NULL, quantity INT DEFAULT 0, FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT);');

    await pool.query('SET FOREIGN_KEY_CHECKS = 0;');
    await pool.query('TRUNCATE TABLE items;');
    await pool.query('TRUNCATE TABLE categories;');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;');

    await pool.query(`INSERT INTO categories (name, description) VALUES
      ('Food', 'Daily essentials and groceries'),
      ('Electronics', 'Gadgets, phones and computers'),
      ('Clothing', 'Apparel and fashion items'),
      ('Books', 'Educational and entertainment books'),
      ('Home & Living', 'Furniture and home appliances'),
      ('Sports & Outdoors', 'Sporting goods and outdoor equipment');`);

    await pool.query(`INSERT INTO items (category_id, item_name, price, quantity) VALUES
      (1, 'Apple', 25000.00, 100),
      (1, 'Milk', 32000.00, 50),
      (1, 'Bread', 15000.00, 30),
      (2, 'Smartphone', 5500000.00, 15),
      (2, 'Wireless Mouse', 250000.00, 40),
      (3, 'T-Shirt', 120000.00, 60),
      (3, 'Jeans', 350000.00, 25),
      (4, 'Node.js Programming', 180000.00, 20),
      (5, 'Desk Lamp', 150000.00, 35),
      (5, 'Coffee Mug', 45000.00, 80);`);
    
    console.log('--- Đã khởi tạo Database và dữ liệu mẫu thành công ---');

    console.log('\n=== QUESTION 1 ===');
    const [q1] = await pool.execute('SELECT * FROM items WHERE price >= 500000 AND quantity > 0 ORDER BY price DESC');
    console.log(q1);

    console.log('\n=== QUESTION 2 ===');
    const [q2] = await pool.execute("SELECT * FROM items WHERE item_name LIKE ? OR item_name LIKE ?", ['%Gaming%', '%Wireless%']);
    console.log(q2);

    console.log('\n=== QUESTION 3 ===');
    const [q3] = await pool.execute('SELECT SUM(quantity) AS total_stock, AVG(price) AS avg_price, COUNT(*) AS total_items FROM items');
    console.log(q3);

    console.log('\n=== QUESTION 4 ===');
    const [q4] = await pool.execute(`
      SELECT c.name AS category_name, COUNT(i.id) AS total_items, SUM(i.price * i.quantity) AS total_inventory_value
      FROM categories c JOIN items i ON c.id = i.category_id
      GROUP BY c.id, c.name
      HAVING total_inventory_value > 10000000
    `);
    console.log(q4);

  } catch (err) {
    console.error('Lỗi MySQL:', err.message);
  } finally {
    await pool.end();
  }
}

main();