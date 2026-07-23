
CREATE TABLE users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user'
);

-- ===========================
-- BOOKS
-- ===========================
CREATE TABLE books (
    bookId INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    quantity INT NOT NULL DEFAULT 0,
    availableQuantity INT NOT NULL DEFAULT 0
);

-- ===========================
-- BORROW RECORDS
-- ===========================
CREATE TABLE borrowRecords (
    borrowId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    bookId INT NOT NULL,
    borrowDate DATE NOT NULL,
    dueDate DATE NOT NULL,
    returnDate DATE,
    status ENUM('Borrowed','Returned','Overdue') DEFAULT 'Borrowed',

    CONSTRAINT fk_user
        FOREIGN KEY (userId)
        REFERENCES users(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_book
        FOREIGN KEY (bookId)
        REFERENCES books(bookId)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

UPDATE books
SET availableQuantity = quantity
WHERE availableQuantity > quantity;

UPDATE books
SET availableQuantity = quantity;