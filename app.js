
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // sesh expires after 1 week of inactivity
    cookie : { maxAge: 1000 * 60 * 60 * 24 * 7}
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'RP738964$',
    database: 'our database name'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));



app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

// Create a Middleware to check if user is logged in.
const checkAuthenticated = (req, res,next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
}
// Create a Middleware to check if user is admin.
const checkAdmin = (req, res, next) => {
    if ( req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied.');
        res.redirect('/dashboard');
    }
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


// Create a middleware function validateRegistration 
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact } = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.send('All fields are required.');
    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
}

// Integrate validateRegistration into the register route. 
app.post('/register', validateRegistration,     (req, res) => {
    //Update register route to include role. 
    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, 'user'], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

//Insert code for login routes to render login page below
app.get('/login', (req,res) => {
    res.render('login', {
        // retrieve success and error messages from the flash middleware and 
        // pass them to the login view for display
        messages: req.flash('success'),
        errors: req.flash('error')
    })
})

//Insert code for login routes for form submission below 
app.post('/login', (req,res) => {
    const { email, password} = req.body;
    // validate email and pw
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email,password],(err,results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // successful login
            req.session.user = results[0]; // store user in session
            req.flash('success', 'login successsful!');
            res.redirect('/dashboard');
        } else {
            // invalid creds
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    }) 
})
//code for dashboard route to render dashboard page for users. 
app.get('/dashboard', checkAuthenticated, (req,res) => {
    res.render('dashboard', { user: req.session.user});
});   
// code for admin route to render dashboard page for admin. 
app.get('/admin', checkAuthenticated, checkAdmin, (req,res) => {
    res.render('admin', { user: req.session.user});
});

app.get('/admin/manage-admins', checkAuthenticated, checkAdmin, (req,res) => {
    const sql = 'SELECT * FROM users WHERE role = ?';
    db.query(sql, ['admin'],(err, results) => {
        if (err) {
            throw err;
        }
        res.render('viewadmin',{
            admins: results,
            currentUser: req.session.user,
        })
    })
})
// code for logout route 
app.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/');
})
// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});

