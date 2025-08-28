require("dotenv").config();
const mysql = require("mysql2");
const express = require("express");
var cors = require("cors");
const path = require("path");
//const util = require("util");

var app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3001;

// MySQL connection setup using environment variables
const mysqlConnection = mysql.createConnection({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
});

mysqlConnection.connect((err) => {
  if (err) console.log(err);
  else console.log("Connected");
});

app.get("/install", (req, res) => {
  let message = "Tables Created Successfully";

  const createProducts = `
    CREATE TABLE IF NOT EXISTS Products (
      product_id INT AUTO_INCREMENT,
      product_url VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      PRIMARY KEY (product_id)
    )`;

  const createProductDescription = `
  CREATE TABLE IF NOT EXISTS ProductDescription (
    description_id INT AUTO_INCREMENT,
    product_id INT NOT NULL,
    product_brief_description TEXT NOT NULL,
    product_description TEXT NOT NULL,
    product_img VARCHAR(255) NOT NULL,
    product_link VARCHAR(255) NOT NULL,
    PRIMARY KEY (description_id),
    FOREIGN KEY (product_id) REFERENCES Products(product_id)
  )
`;

  const createProductPrice = `
    CREATE TABLE IF NOT EXISTS ProductPrice (
      price_id INT AUTO_INCREMENT,
      product_id INT NOT NULL,
      starting_price VARCHAR(255) NOT NULL,
      price_range VARCHAR(255) NOT NULL,
      PRIMARY KEY (price_id),
      FOREIGN KEY (product_id) REFERENCES Products(product_id)
    )`;

  const createUserTable = `
    CREATE TABLE IF NOT EXISTS UserTable (
      user_id INT AUTO_INCREMENT,
      user_name VARCHAR(255) NOT NULL,
      user_password VARCHAR(255) NOT NULL,
      PRIMARY KEY (user_id)
    )`;

  const createOrderTable = `
    CREATE TABLE IF NOT EXISTS OrderTable (
      order_id INT AUTO_INCREMENT,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      PRIMARY KEY (order_id),
      FOREIGN KEY (product_id) REFERENCES Products(product_id),
      FOREIGN KEY (user_id) REFERENCES UserTable(user_id)
    )`;

  // Chain queries to preserve order and avoid FK errors
  mysqlConnection.query(createProducts, (err) => {
    if (err) return console.log(err);
    mysqlConnection.query(createProductDescription, (err) => {
      if (err) return console.log(err);
      mysqlConnection.query(createProductPrice, (err) => {
        if (err) return console.log(err);
        mysqlConnection.query(createUserTable, (err) => {
          if (err) return console.log(err);
          mysqlConnection.query(createOrderTable, (err) => {
            if (err) return console.log(err);
            res.send(message);
          });
        });
      });
    });
  });
});
// //method 1
app.post("/addiphones", (req, res) => {
  const {
    product_name,
    product_url,
    product_brief_description,
    product_description,
    product_img,
    product_link,
    starting_price,
    price_range,
    user_name,
    user_password,
  } = req.body;

  mysqlConnection.query(
    `INSERT INTO Products (product_url, product_name) VALUES (?, ?)`,
    [product_url, product_name],
    (err, productResult) => {
      if (err) return res.status(500).send("Error inserting product");

      const product_id = productResult.insertId;

      mysqlConnection.query(
        `INSERT INTO ProductDescription (product_id, product_brief_description, product_description, product_img, product_link)
         VALUES (?, ?, ?, ?, ?)`,
        [
          product_id,
          product_brief_description,
          product_description,
          product_img,
          product_link,
        ],
        (err) => {
          if (err)
            return res.status(500).send("Error inserting product description");

          mysqlConnection.query(
            `INSERT INTO ProductPrice (product_id, starting_price, price_range) VALUES (?, ?, ?)`,
            [product_id, starting_price, price_range],
            (err) => {
              if (err)
                return res.status(500).send("Error inserting product price");

              mysqlConnection.query(
                `INSERT INTO UserTable (user_name, user_password) VALUES (?, ?)`,
                [user_name, user_password],
                (err, userResult) => {
                  if (err) return res.status(500).send("Error inserting user");

                  const user_id = userResult.insertId;

                  mysqlConnection.query(
                    `INSERT INTO OrderTable (product_id, user_id) VALUES (?, ?)`,
                    [product_id, user_id],
                    (err) => {
                      if (err)
                        return res.status(500).send("Error inserting order");

                      res.send("All data saved successfully");
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});
app.get("/iphones", (req, res) => {
  const sql = `
    SELECT 
      p.product_id,
      p.product_name,
      p.product_url,
      pd.product_brief_description,
      pd.product_description,
      pd.product_img,
      pd.product_link,
      pp.starting_price,
      pp.price_range,
      u.user_id,
      u.user_name
    FROM Products p
    LEFT JOIN ProductDescription pd ON p.product_id = pd.product_id
    LEFT JOIN ProductPrice pp ON p.product_id = pp.product_id
    LEFT JOIN OrderTable o ON p.product_id = o.product_id
    LEFT JOIN UserTable u ON o.user_id = u.user_id;
  `;

  mysqlConnection.query(sql, (err, results) => {
    if (err) {
      console.error("SQL error:", err);
      return res.status(500).send("Database error");
    }
    //console.log(results)
    const Iphons = { products: results };
    res.json(Iphons);
    //console.log(results)
  });
});

// GET: Show the form at /add-product
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Single Iphone product
app.get("/iphones/:id", (req, res) => {
  const phoneId = req.params.id;
  const query = `
    SELECT * FROM Products
    JOIN ProductDescription ON Products.product_id = ProductDescription.product_id
    JOIN ProductPrice ON Products.product_id = ProductPrice.product_id
    WHERE Products.product_id = ?
  `;

  mysqlConnection.query(query, [phoneId], (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      res.status(500).send("Internal Server Error");
    } else if (rows.length === 0) {
      res.status(404).send("Product not found");
    } else {
      const phone = rows[0];
      res.json(phone);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
