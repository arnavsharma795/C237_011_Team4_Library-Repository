const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

const connection = mysql.createConnection({
    host: 'c237-asyraf-mysql.mysql.database.azure.com',
    user: 'c237_011',
    password: 'c237011@2026!',
    database: 'c237_011_team4_rplibrary',
    ssl: {
        rejectUnauthorized: false
    }
});

connection.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});


// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// ===========================
// MANAGE USERS
// ===========================

app.get('/manageUsers', checkAuthenticated, checkAdmin, (req, res) => {

        const search = req.query.search || "";
        const role = req.query.role || "";

        let sql = "SELECT * FROM users WHERE 1=1";
        let params = [];

        if (search !== "") {
            sql += " AND email LIKE ?";
            params.push(`%${search}%`);
        }

        if (role !== "") {
            sql += " AND role = ?";
            params.push(role);
        }

        sql += " ORDER BY userId";

        connection.query(sql, params, (err, results) => {
            if (err) throw err;

            res.render('manageUser', {
                users: results,
                user: req.session.user,
                search,
                role
            });
        });

    });

// ===========================
// EDIT USER PAGE
// ===========================

app.get('/editUser/:id', checkAuthenticated, checkAdmin, (req, res) => {

        connection.query(
            "SELECT * FROM users WHERE userId = ?",
            [req.params.id],
            (err, results) => {

                if (err) throw err;

                if (results.length == 0) {
                    return res.send("User not found");
                }

                res.render("editUser", {
                    editUser: results[0],
                    user: req.session.user
                });
            });
    });

// ===========================
// UPDATE USER
// ===========================

app.post('/editUser/:id', checkAuthenticated, checkAdmin, (req, res) => {

        const {name, email, phone, role} = req.body;

        const sql = `
            UPDATE users
            SET
                name = ?,
                email = ?,
                phone = ?,
                role = ?
            WHERE userId = ?
        `;

        connection.query(
            sql,
            [name, email, phone, role, req.params.id ],
            (err) => {
                if (err) throw err;

                res.redirect('/manageUsers');
            });
    });
    
// ===========================
// DELETE USER
// ===========================

app.get('/deleteUser/:id', checkAuthenticated, checkAdmin, (req, res) => {

        connection.query(
            "DELETE FROM users WHERE userId = ?",
            [req.params.id],
            (err) => {
                if (err) throw err;

                res.redirect('/manageUsers');
            });
    });

// ===========================
// CREATE ADMIN
// ===========================

app.get('/createAdmin', checkAuthenticated, checkAdmin, (req, res) => {
        res.render('createAdmin', {
            errors: req.flash('error'),
            user: req.session.user
        });
    });

app.post('/createAdmin', checkAuthenticated, checkAdmin, (req, res) => {
        const {name, email, phone, password } = req.body;
        if (!name || !email || !phone || !password) {
            req.flash(
                'error',
                'All fields are required'
            );

            return res.redirect('/createAdmin');
        }
        const sql = `
            INSERT INTO users (name, email, phone, password, role) VALUES ( ?, ?, ?, SHA1(?), 'admin' )
        `;
        connection.query(
            sql,
            [ name, email, phone, password ],
            (err) => {
                if(err){
                    console.log(err);
                    req.flash(
                        'error',
                        'Email already exists'
                    );
                    return res.redirect('/createAdmin');
                }
                req.flash(
                    'success',
                    'Admin account created successfully'
                );
                res.redirect('/inventory');
            }
        );
    });

// ===========================
// HOME
// ===========================

app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user
    });
});

// ===========================
// REGISTER
// ===========================

app.get('/register', (req, res) => {
    res.render('register', {
        errors: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

app.post('/register', (req, res) => {

    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long.');
        return res.redirect('/register');
    }

    const sql = `
        INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, SHA1(?), 'user')
    `;

    connection.query(sql,
        [name, email, phone, password],
        (err) => {

            if (err) {
                req.flash('error', 'Email already exists.');
                return res.redirect('/register');
            }

            req.flash('success', 'Registration successful. Please log in.');
            res.redirect('/login');
        });
});


// ===========================
// LOGIN
// ===========================

app.get('/login', (req, res) => {

    res.render('login', {
        messages: req.flash('success'),
        errors: req.flash('error')
    });

});

app.post('/login', (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT * FROM users
        WHERE email = ?
        AND password = SHA1(?)
    `;

    connection.query(
        sql,
        [email, password],
        (err, results) => {

            if (err) throw err;

            if (results.length === 0) {

                req.flash(
                    'error',
                    'Invalid email or password'
                );

                return res.redirect('/login');
            }

            req.session.user = results[0];

            if (results[0].role === 'admin') {
                return res.redirect('/inventory');
            }

            res.redirect('/viewBooks');
        }
    );
});


// ===========================
// LOGOUT
// ===========================

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// ===========================
// USER VIEW BOOKS
// ===========================

app.get('/viewBooks', checkAuthenticated, (req, res) => {

        connection.query(
            'SELECT * FROM books',
            (err, results) => {

                if (err) throw err;

                res.render('viewBooks', {
                    books: results,
                    user: req.session.user
                });
            }
        );
    });


// ===========================
// BOOK DETAILS
// ===========================

app.get('/book/:id', checkAuthenticated, (req, res) => {

        const bookId = req.params.id;

        connection.query(
            'SELECT * FROM books WHERE bookId=?',
            [bookId],
            (err, results) => {

                if (err) throw err;

                if (results.length === 0) {
                    return res.send('Book not found');
                }

                res.render('book', {
                    book: results[0],
                    user: req.session.user
                });
            }
        );
    });


// ===========================
// SEARCH BOOK
// ===========================

app.get('/search', checkAuthenticated, (req, res) => {

        const keyword = req.query.keyword;

        const sql = `
            SELECT * FROM books
            WHERE title LIKE ?
        `;

        connection.query(
            sql, [`%${keyword}%`], (err, results) => {

                if (err) throw err;

                res.render('viewBooks', {
                    books: results,
                    user: req.session.user
                });
            }
        );
    });

// ===========================
// FILTER
// ===========================

app.get('/filter', checkAuthenticated, (req, res) => {
    const genre = req.query.genre;
    let sql = 'SELECT * FROM books';
    let params = [];

    if (genre && genre !== '') {
        if (genre === 'Others') {
            sql += ' WHERE genre NOT IN ("Fantasy", "Science", "Romance", "Adventure", "Horror") OR genre IS NULL OR genre = ""';
        } else {
            sql += ' WHERE genre = ?';
            params.push(genre);
        }
    }

        connection.query(sql, params, (err, results) => {
            if (err) throw err;
            res.render("viewBooks", { books: results, user: req.session.user });
        });
    });

// ===========================
// BORROW BOOK
// ===========================

app.post('/borrowBook/:id',
    checkAuthenticated,
    (req, res) => {

        const bookId = req.params.id;
        const userId = req.session.user.userId;

        connection.query(
            `
            SELECT availableQuantity
            FROM books
            WHERE bookId = ?
            `,
            [bookId],
            (err, results) => {

                if (err) throw err;

                if (results.length === 0) {
                    return res.send("Book not found.");
                }

                if (results[0].availableQuantity <= 0) {
                    return res.send("Book is currently out of stock.");
                }

                const insertSql = `
                    INSERT INTO borrowRecords
                    (userId, bookId, borrowDate, dueDate, status)
                    VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Borrowed')
                `;

                connection.query(
                    insertSql,
                    [userId, bookId],
                    (err) => {

                        if (err) throw err;

                        connection.query(
                            `
                            UPDATE books
                            SET availableQuantity = availableQuantity - 1
                            WHERE bookId = ?
                            `,
                            [bookId]
                        );

                        res.redirect('/viewBorrowed');
                    }
                );
            }
        );
    });

// ===========================
// VIEW BORROWED BOOKS
// ===========================

app.get('/viewBorrowed',
    checkAuthenticated,
    (req, res) => {

        const userId =
            req.session.user.userId;

        const sql = `
            SELECT
                br.borrowId,
                br.borrowDate,
                br.dueDate,
                br.status,
                b.title,
                b.author
            FROM borrowRecords br
            JOIN books b
            ON br.bookId = b.bookId
            WHERE br.userId = ?
        `;

        connection.query( sql, [userId], (err, results) => {

                if (err) throw err;

                res.render('viewBorrowed', {
                    borrowedBooks: results,
                    user: req.session.user
                });
            });
    });

app.post('/clearbooks/:id', checkAuthenticated, (req, res) => {
    const borrowId = req.params.id;

    const sql = `
        DELETE br
        FROM borrowRecords br
        JOIN books b ON br.bookId = b.bookId
        WHERE br.borrowId = ?
    `;

    connection.query(sql, [borrowId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting record');
        }
        res.redirect('/viewBorrowed');
    });
});
// ===========================
// RETURN BOOK
// ===========================

app.post('/returnBook/:id', checkAuthenticated, (req, res) => {

        const borrowId = req.params.id;

        const getBookSql = `
            SELECT * FROM borrowRecords
            WHERE borrowId = ?
        `;

        connection.query( getBookSql, [borrowId], (err, results) => {

                if (err) throw err;

                const bookId =
                    results[0].bookId;

                connection.query(
                    `
                    UPDATE borrowRecords
                    SET
                    status='Returned',
                    returnDate=CURDATE()
                    WHERE borrowId=?
                    `,
                    [borrowId]
                );

                connection.query(
                    `
                    UPDATE books
                    SET
                    availableQuantity =
                    availableQuantity + 1
                    WHERE bookId = ?
                    `,
                    [bookId]
                );

                res.redirect('/viewBorrowed');
            });
    });
// ===========================
// ADMIN VIEW BORROW RECORDS
// ===========================

app.get('/borrowRecords',
    checkAuthenticated,
    checkAdmin,
    (req, res) => {

        const sql = `
            SELECT
                br.borrowId,
                u.name,
                u.email,
                b.title,
                b.author,
                br.borrowDate,
                br.dueDate,
                br.status
            FROM borrowRecords br
            JOIN users u
            ON br.userId = u.userId
            JOIN books b
            ON br.bookId = b.bookId
            ORDER BY br.borrowDate DESC
        `;


        connection.query(sql, (err, results) => {

            if (err) throw err;

            res.render('borrowRecords', {
                records: results,
                user: req.session.user
            });

        });

    });

// ===========================
// DELETE ALL BORROW HISTORY (ADMIN)
// ===========================

// ===========================
// DELETE ALL BORROW HISTORY
// ===========================

app.get('/deleteAllBorrowRecords',
    checkAuthenticated,
    checkAdmin,
    (req, res) => {

        const sql = `
            DELETE FROM borrowRecords
        `;

        connection.query(
            sql,
            (err) => {

                if (err) throw err;

                res.redirect('/borrowRecords');

            }
        );

    });
// ===========================
// ADMIN INVENTORY
// ===========================

app.get('/inventory', checkAuthenticated, checkAdmin, (req, res) => {

        connection.query(
            'SELECT * FROM books',
            (err, results) => {

                if (err) throw err;

                res.render('inventory', {
                    books: results,
                    user: req.session.user
                });
            });
    });

// ===========================
// ADD BOOK
// ===========================

app.get('/addBook', checkAuthenticated, checkAdmin, (req, res) => {
        res.render('addBook');
    });

app.post('/addBook', checkAuthenticated, checkAdmin, (req, res) => {

        console.log("FULL BODY:");
        console.log(req.body);

        const { title, author, genre, description, quantity, image } = req.body;

        console.log("IMAGE VALUE:");
        console.log(image);

        const sql = `
            INSERT INTO books ( title, author, genre, description, image, quantity, availableQuantity) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        connection.query(
            sql, [ title, author, genre, description, image, quantity, quantity ], (err, result) => {

                if (err) {
                    console.log("DATABASE ERROR:");
                    console.log(err);
                    return res.send(err);
                }

                console.log("INSERT SUCCESS:");
                console.log(result);

                res.redirect('/inventory');
            }
        );
    });

// ===========================
// EDIT BOOK
// ===========================

app.get('/editBook/:id',
    checkAuthenticated,
    checkAdmin,
    (req, res) => {

        connection.query(
            `
            SELECT *
            FROM books
            WHERE bookId=?
            `,
            [req.params.id],
            (err, results) => {

                if (err) throw err;

                res.render('editBook', {
                    book: results[0]
                });
            });
    });

app.post('/editBook/:id',
    checkAuthenticated,
    checkAdmin,
    (req, res) => {

        const {
            title,
            author,
            genre,
            description,
            quantity,
            image
        } = req.body;

        
    if (image && image.startsWith("data:image")) {
        return res.send("Please use an image URL instead of uploading an image.");
    
    }
        connection.query(
            "SELECT quantity, availableQuantity FROM books WHERE bookId = ?",
            [req.params.id],
            (err, results) => {

                if (err) throw err;

                const oldQuantity = results[0].quantity;
                const oldAvailable = results[0].availableQuantity;

                // Number of books currently borrowed
                const borrowed = oldQuantity - oldAvailable;

                // Calculate the new available quantity
                const newAvailable = Math.max(0, quantity - borrowed);

                const sql = `
                    UPDATE books
                    SET
                        title = ?,
                        author = ?,
                        genre = ?,
                        description = ?,
                        image = ?,
                        quantity = ?,
                        availableQuantity = ?
                    WHERE bookId = ?
                `;

                connection.query(
                    sql,
                    [
                        title,
                        author,
                        genre,
                        description,
                        image,
                        quantity,
                        newAvailable,
                        req.params.id
                    ],
                    (err) => {

                        if (err) throw err;

                        res.redirect('/inventory');
                    }
                );
            }
        );
    });

// ===========================
// DELETE BOOK
// ===========================

app.get('/deleteBook/:id', checkAuthenticated, checkAdmin, (req, res) => {

        connection.query(
            `
            DELETE FROM books WHERE bookId=?
            `,
            [req.params.id],  (err) => {

                if (err) throw err;

                res.redirect('/inventory');
            });
    });

// ===========================
// SERVER
// ===========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(
        `Server running at http://localhost:${PORT}`
    );
});